"use strict";

let fs = require("fs"),
  path = require("path"),
  util = require("./util"),
  ioutil = require("./ioutil"),
  Base = require("./base"),
  {
    ipcRenderer
  } = require("electron");

class DownloadJob extends Base {
  /**
   *
   * @param s3options
   * @param config
   *    config.from {object|string}  {bucket, key} or s3://bucket/test/a.jpg
   *    config.to   {object|string}  {name, path} or /home/admin/a.jpg
   *    config.resumeDownload  {bool} default false
   *    config.multipartDownloadThreshold  {number} default 100M
   *
   */
  constructor(s3options, config) {
    super();

    this._config = {};
    Object.assign(this._config, config);

    if (!this._config.from) {
      console.log("upload needs from option");
      return;
    }
    if (!this._config.to) {
      console.log("upload needs to option");
      return;
    }

    this.id = "dj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);

    this.s3options = s3options;

    this.from = util.parseS3Path(this._config.from); //s3 path
    this.to = util.parseLocalPath(this._config.to); //local path

    this.prog = this._config.prog || {
      total: 0,
      loaded: 0
    };

    this.maxConcurrency = config.maxConcurrency || 10;
    this.resumeDownload = this._config.resumeDownload || false;
    this.multipartDownloadThreshold = this._config.multipartDownloadThreshold || 100;
    this.multipartDownloadSize = this._config.multipartDownloadSize || 8;

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
    this.tmpfile = this.to.path + ".download";
    this.isDebug = this._config.isDebug;
  }
}

DownloadJob.prototype.start = function () {
  if (this.status == "running") return;

  if (this.isDebug) {
    console.log(`Try downloading s3://${this.from.bucket}/${this.from.key} to ${this.to.path}`);
  }

  this.message = "";
  this.stopFlag = false;
  this.startTime = new Date().getTime();
  this.endTime = null;
  this._listener = this.startDownload.bind(this);

  this._changeStatus("running");

  // start
  let job = {
    job: this.id,
    key: 'job-download',
    options: {
      s3Options: this.s3options,
      resumeDownload: this.resumeDownload,
      maxConcurrency: this.maxConcurrency,
      multipartDownloadThreshold: this.multipartDownloadThreshold * 1024 * 1024,
      multipartDownloadSize: this.multipartDownloadSize * 1024 * 1024
    },
    params: {
      s3Params: {
        Bucket: this.from.bucket,
        Key: this.from.key
      },
      localFile: this.tmpfile,
      useElectronNode: this.useElectronNode,
      isDebug: this.isDebug
    }
  };
  if (this.isDebug) {
    console.log(`[JOB] ${JSON.stringify(job)}`);
  }
  ipcRenderer.send('asynchronous-job', job);
  ipcRenderer.on(this.id, this._listener);

  this.startSpeedCounter();

  return this;
};

DownloadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (this.isDebug) {
    console.log(`Pausing s3://${this.from.bucket}/${this.from.key}`);
  }

  clearInterval(this.speedTid);

  this.stopFlag = true;
  this.speed = 0;
  this.predictLeftTime = 0;

  this._changeStatus("stopped");

  return this;
};

DownloadJob.prototype.wait = function () {
  if (this.status == "waiting") return;

  if (this.isDebug) {
    console.log(`Pendding s3://${this.from.bucket}/${this.from.key}`);
  }

  this._lastStatusFailed = this.status == "failed";
  this.stopFlag = true;

  this._changeStatus("waiting");

  return this;
};

/**
 * downloading
 */
DownloadJob.prototype.startDownload = function (event, data) {
  let self = this;

  if (self.isDebug) {
    console.log(`[IPC MAIN] => ${JSON.stringify(data)}`);
  }

  switch (data.key) {
  case 'fileStat':
    var prog = data.data;

    self.prog.total = prog.progressTotal;
    self.emit('progress', self.prog);
    break;

  case 'progress':
    var prog = data.data;

    self.prog.loaded = prog.progressLoaded;
    self.emit('progress', self.prog);
    break;

  case 'fileDownloaded':
    ipcRenderer.removeListener(self.id, self._listener);

    self._changeStatus("verifying");

    fs.rename(self.tmpfile, self.to.path, function (err) {
      if (err) {
        console.error(`rename file ${self.tmpfile} to ${self.to.path} error:`, err);

        self._changeStatus("failed");
        self.emit("error", err);
      } else {
        self._changeStatus("finished");
        self.emit("complete");
      }
    });

    break;

  case 'error':
    console.warn("download object error:", data.error);
    ipcRenderer.removeListener(self.id, self._listener);

    self.message = data;
    self._changeStatus("failed");
    self.emit("error", data.error);
    break;

  case 'debug':
    if (!self.isDebug) {
      console.log("Debug", data);
    }
    break;

  default:
    console.log("Unknown", data);
  }
};

DownloadJob.prototype.startSpeedCounter = function () {
  let self = this;

  self.lastLoaded = self.prog.loaded || 0;
  self.lastSpeed = 0;

  clearInterval(self.speedTid);
  self.speedTid = setInterval(function () {
    if (self.stopFlag) {
      self.speed = 0;
      self.predictLeftTime = 0;
      return;
    }

    let avgSpeed = self.prog.loaded / (self.startTime - new Date().getTime()) * 1000;

    self.speed = self.prog.loaded - self.lastLoaded;
    if (self.speed <= 0 || (self.lastSpeed / self.speed) > 1.2) {
      self.speed = self.lastSpeed * 0.95;
    }
    if (self.speed < avgSpeed) {
      self.speed = avgSpeed;
    }
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed * 1.2);
    }

    self.lastLoaded = self.prog.loaded;
    self.lastSpeed = self.speed;

    self.predictLeftTime =
      self.speed <= 0 ?
      0 :
      Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

DownloadJob.prototype._changeStatus = function (status) {
  this.status = status;
  this.emit("statuschange", this.status);

  if (status == "failed" || status == "stopped" || status == "finished") {
    clearInterval(this.speedTid);

    this.endTime = new Date().getTime();
    this.speed = 0;
    this.predictLeftTime = 0;
  }
};

module.exports = DownloadJob;