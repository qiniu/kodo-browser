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
   *    config.from {object|string}  {bucket, key} or kodo://bucket/test/a.jpg
   *    config.to   {object|string}  {name, path} or /home/admin/a.jpg
   *    config.resumeDownload  {bool} default false
   *    config.multipartDownloadThreshold  {number} default 100M
   *
   */
  constructor(config) {
    super();

    this._config = Object.assign({}, config);
    if (!this._config.from) {
      console.log("upload needs from option");
      return;
    }
    if (!this._config.to) {
      console.log("upload needs to option");
      return;
    }

    this.id = "dj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);
    this.clientOptions = this._config.clientOptions;
    this.kodoBrowserVersion = Global.app.version;

    this.from = this._config.from;
    this.to = util.parseLocalPath(this._config.to);
    this.region = this._config.region;
    this.domain = this._config.domain;
    this.backendMode = this._config.backendMode;

    this.prog = this._config.prog || {};
    this.prog.total = this.prog.total || 0;
    this.prog.loaded = this.prog.loaded || this.prog.synced || 0;

    this.maxConcurrency = config.maxConcurrency || 10;
    this.resumeDownload = this._config.resumeDownload || false;
    this.multipartDownloadThreshold = this._config.multipartDownloadThreshold || 100;
    this.multipartDownloadSize = this._config.multipartDownloadSize || 8;
    this.downloadSpeedLimit = this._config.downloadSpeedLimit || false;

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.isStopped = this.status != "running";
    this.tmpfile = this.to.path + ".download";
    this._listener = this.startDownload.bind(this);
    this.isDebug = this._config.isDebug;
  }
}

DownloadJob.prototype.start = function (params) {
  if (this.status == "running") return;

  if (this.isDebug) {
    console.log(`Try downloading kodo://${this.from.bucket}/${this.from.key} to ${this.to.path}`);
  }

  // start
  params = params || {};
  params.prog = params.prog || {};
  params.prog.loaded = params.prog.loaded || 0;
  params.prog.synced = params.prog.synced || 0;
  params.prog.total = params.prog.total || 0;

  this.message = "";
  this.isStopped = false;
  this.startedAt = new Date().getTime();
  this.endedAt = null;

  this._changeStatus("running");

  // start
  let job = {
    job: this.id,
    key: 'job-download',
    clientOptions: Object.assign(this.clientOptions, { backendMode: this.backendMode }),
    options: {
      resumeDownload: this.resumeDownload,
      maxConcurrency: this.maxConcurrency,
      multipartDownloadThreshold: this.multipartDownloadThreshold * 1024 * 1024,
      multipartDownloadSize: this.multipartDownloadSize * 1024 * 1024,
      downloadSpeedLimit: this.downloadSpeedLimit
    },
    params: {
      region: this.region,
      domain: this.domain,
      bucket: this.from.bucket,
      key: this.from.key,
      localFile: this.tmpfile,
      downloadedBytes: params.prog.synced,
      isDebug: this.isDebug
    }
  };

  if (this.isDebug) {
    console.log(`[JOB] ${JSON.stringify(job)}`);
  }
  ipcRenderer.on(this.id, this._listener);
  ipcRenderer.send('asynchronous-job', job);

  this.startSpeedCounter();

  return this;
};

DownloadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (this.isDebug) {
    console.log(`Pausing kodo://${this.from.bucket}/${this.from.key}`);
  }

  clearInterval(this.speedTid);

  this.isStopped = true;
  this.speed = 0;
  this.predictLeftTime = 0;

  this._changeStatus("stopped");
  this.emit('stop');

  ipcRenderer.send('asynchronous-job', {
    job: this.id,
    key: 'job-stop',
  });
  ipcRenderer.removeListener(this.id, this._listener);

  return this;
};

DownloadJob.prototype.wait = function () {
  if (this.status == "waiting") return;

  if (this.isDebug) {
    console.log(`Pending kodo://${this.from.bucket}/${this.from.key}`);
  }

  this._lastStatusFailed = this.status == "failed";
  this.isStopped = true;

  this._changeStatus("waiting");
  this.emit('pause');

  return this;
};

/**
 * downloading
 */
DownloadJob.prototype.startDownload = function (event, data) {
  let self = this;

  if (self.isDebug) {
    console.log("[IPC MAIN]", data);
  }

  switch (data.key) {
    case 'fileStat':
      var prog = data.data;

      self.prog.total = prog.progressTotal;
      self.prog.resumable = prog.progressResumable;
      self.emit('progress', self.prog);
      break;

    case 'progress':
      var prog = data.data;

      self.prog.loaded = prog.progressLoaded;
      self.prog.resumable = prog.progressResumable;
      self.emit('progress', self.prog);
      break;

    case 'filePartDownloaded':
      var part = data.data;

      self.prog.synced = self.prog.synced + part.size || part.size;
      self.emit('partcomplete', self.prog);
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
      console.warn("download object error:", data);
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
    if (self.isStopped) {
      self.speed = 0;
      self.predictLeftTime = 0;
      return;
    }

    let avgSpeed = self.prog.loaded / (self.startedAt - new Date().getTime()) * 1000;

    self.speed = self.prog.loaded - self.lastLoaded;
    if (self.speed <= 0 || (self.lastSpeed / self.speed) > 1.1) {
      self.speed = self.lastSpeed * 0.95;
    }
    if (self.speed < avgSpeed) {
      self.speed = avgSpeed;
    }
    self.lastLoaded = self.prog.loaded;
    self.lastSpeed = self.speed;

    if (self.downloadSpeedLimit && self.speed > self.downloadSpeedLimit * 1024) {
      self.speed = self.downloadSpeedLimit * 1024;
    }
    self.emit("speedchange", self.speed * 1.2);

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

    this.endedAt = new Date().getTime();
    this.speed = 0;
    this.predictLeftTime = 0;
  }
};

module.exports = DownloadJob;
