"use strict";

const proc = require("process");
const {
  Client
} = require("./ioutil");

proc.on('uncaughtException', function (err) {
  proc.send({
    key: 'error',
    error: err
  });
});

proc.send({
  key: 'env',
  execPath: proc.execPath,
  version: proc.version
});

proc.on('message', function (msg) {
  switch (msg.key) {
  case 'stop':
    proc.exit(0);
    break;

  case 'start':
    var client = new Client(msg.data.options);

    var uploader = client.uploadFile(msg.data.params);
    uploader.on('fileStat', function (e2) {
      proc.send({
        job: msg.data.job,
        key: 'fileStat',
        data: {
          progressLoaded: 0,
          progressTotal: e2.progressTotal
        }
      });
    });
    uploader.on('progress', function (e2) {
      proc.send({
        job: msg.data.job,
        key: 'progress',
        data: {
          progressLoaded: e2.progressLoaded,
          progressTotal: e2.progressTotal
        }
      });
    });
    uploader.on('fileUploaded', function (result) {
      proc.send({
        job: msg.data.job,
        key: 'fileUploaded',
        data: result
      });
    });
    uploader.on('error', function (err) {
      proc.send({
        job: msg.data.job,
        key: 'error',
        error: err
      });
    });
    break;

  default:
    proc.send({
      key: msg.key,
      message: msg
    });
  }
});