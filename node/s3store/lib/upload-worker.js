"use strict";

const {
  Client
} = require("./ioutil");

process.on('uncaughtException', function (err) {
  process.send({
    key: 'error',
    exception: err,
    stack: err.stack
  });
});

process.send({
  key: 'env',
  execPath: process.execPath,
  version: process.version
});

process.on('message', function (msg) {
  switch (msg.key) {
  case 'stop':
    process.exit(0);
    break;

  case 'start':
    var client = new Client(msg.data.options);

    var uploader = client.uploadFile(msg.data.params);
    uploader.on('fileDuplicated', (e2) => {
      process.send({
        job: msg.data.job,
        key: 'fileDuplicated'
      });
    });
    uploader.on('fileStat', (e2) => {
      process.send({
        job: msg.data.job,
        key: 'fileStat',
        data: {
          progressLoaded: 0,
          progressTotal: e2.progressTotal
        }
      });
    });
    uploader.on('progress', (e2) => {
      process.send({
        job: msg.data.job,
        key: 'progress',
        data: {
          progressLoaded: e2.progressLoaded,
          progressTotal: e2.progressTotal
        }
      });
    });
    uploader.on('fileUploaded', (result) => {
      process.send({
        job: msg.data.job,
        key: 'fileUploaded',
        data: result || {}
      });
    });
    uploader.on('error', (err) => {
      process.send({
        job: msg.data.job,
        key: 'error',
        error: err
      });
    });

    break;

  default:
    process.send({
      key: msg.key,
      message: msg
    });
  }
});