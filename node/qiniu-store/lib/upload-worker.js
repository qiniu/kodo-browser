"use strict";

const {
  createClient
} = require("./ioutil");

process.on('uncaughtException', function (err) {
  process.send({
    key: 'error',
    error: err.message,
    stack: err.stack.split("\n")
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
    const client = createClient(msg.data.clientOptions, msg.data.options);

    const uploader = client.uploadFile(msg.data.params);
    uploader.on('fileDuplicated', (prog) => {
      process.send({
        job: msg.data.job,
        key: 'fileDuplicated'
      });
    });
    uploader.on('fileStat', (prog) => {
      process.send({
        job: msg.data.job,
        key: 'fileStat',
        data: {
          progressLoaded: 0,
          progressTotal: prog.progressTotal,
          progressResumable: prog.progressResumable
        }
      });
    });
    uploader.on('progress', (prog) => {
      process.send({
        job: msg.data.job,
        key: 'progress',
        data: {
          progressLoaded: prog.progressLoaded,
          progressTotal: prog.progressTotal,
          progressResumable: prog.progressResumable
        }
      });
    });
    uploader.on('filePartUploaded', (part) => {
      process.send({
        job: msg.data.job,
        key: 'filePartUploaded',
        data: part || {}
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
    uploader.on('debug', (data) => {
      process.send({
        job: msg.data.job,
        key: 'debug',
        data: data
      });
    });

    break;

  default:
    process.send({
      key: `[Error] ${msg.key}`,
      message: msg
    });
  }
});
