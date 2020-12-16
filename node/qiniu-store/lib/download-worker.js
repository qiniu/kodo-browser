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

process.on('message', (msg) => {
  switch (msg.key) {
  case 'stop':
    process.exit(0);
    break;

  case 'start':
    const client = createClient(msg.data.clientOptions, msg.data.options);

    const downloader = client.downloadFile(msg.data.params);
    downloader.on('fileStat', (prog) => {
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
    downloader.on('progress', (prog) => {
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
    downloader.on('filePartDownloaded', (part) => {
      process.send({
        job: msg.data.job,
        key: 'filePartDownloaded',
        data: part || {}
      });
    });
    downloader.on('fileDownloaded', (result) => {
      process.send({
        job: msg.data.job,
        key: 'fileDownloaded',
        data: result || {}
      });
    });
    downloader.on('error', (err) => {
      process.send({
        job: msg.data.job,
        key: 'error',
        error: err
      });
    });
    downloader.on('debug', (data) => {
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
