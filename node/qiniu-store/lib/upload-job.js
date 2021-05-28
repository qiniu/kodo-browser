"use strict";

let fs = require("fs"),
  path = require("path"),
  mime = require("mime"),
  util = require("./util"),
  ioutil = require("./ioutil"),
  Base = require("./base"),
  {
    ipcRenderer
  } = require("electron");

class UploadJob extends Base {
  /**
   *
   * @param config
   *    config.from {object|string}  {name, path} or /home/admin/a.jpg
   *    config.to   {object|string}  {bucket, key} or kodo://bucket/test/a.jpg
   *    config.prog   {object}  {loaded, total}
   *    config.status     {string} default 'waiting'
   *    config.resumeUpload  {bool} default false
   *    config.multipartUploadThreshold  {number} default 100M
   *
   * events:
   *    statuschange(state) 'running'|'waiting'|'stopped'|'failed'|'finished'
   *    stopped
   *    error  (err)
   *    complete
   *    progress ({loaded:100, total: 1200})
   */
  constructor(config) {
    super();

    this._config = {};
    Object.assign(this._config, config);

    if (!this._config.from) {
      console.warn(`Option from is required, but got ${this._config.from}`);
      return;
    }
    if (!this._config.to) {
      console.warn(`Option to is required, but got ${this._config.to}`);
      return;
    }

    this.id = 'uj-' + new Date().getTime() + '-' + ('' + Math.random()).substring(2);
    this.clientOptions = this._config.clientOptions;
    this.kodoBrowserVersion = Global.app.version;

    this.from = util.parseLocalPath(this._config.from);
    this.to = util.parseKodoPath(this._config.to);
    this.region = this._config.region;
    this.backendMode = this._config.backendMode;

    this.prog = this._config.prog || { total: 0, loaded: 0 };

    this.maxConcurrency = config.maxConcurrency || 10;
    this.resumeUpload = this._config.resumeUpload || false;
    this.multipartUploadThreshold = this._config.multipartUploadThreshold || 100;
    this.multipartUploadSize = this._config.multipartUploadSize || 8;
    this.uploadSpeedLimit = this._config.uploadSpeedLimit || false;
    this.uploadedId = this._config.uploadedId;
    this.uploadedParts = this._config.uploadedParts;
    this.overwrite = this._config.overwrite;

    this.message = this._config.message;
    this.status = this._config.status || 'waiting';
    this.isStopped = this.status != 'running';
    this._listener = this.startUpload.bind(this);
    this.isDebug = this._config.isDebug;
  }
}

UploadJob.prototype.start = function (overwrite, prog) {
  if (this.status === "running" || this.status === "finished") {
    return;
  }

  if (this.isDebug) {
    console.log(`Try uploading ${this.from.path} to kodo://${this.to.bucket}/${this.to.key}`);
  }

  // start
  prog = prog || {};

  this.message = "";
  this.isStopped = false;
  this.startedAt = new Date().getTime();
  this.endedAt = null;

  this._changeStatus("running");

  let job = {
    job: this.id,
    key: 'job-upload',
    clientOptions: Object.assign({}, this.clientOptions, { backendMode: this.backendMode, isDebug: this.isDebug }),
    options: {
      resumeUpload: this.resumeUpload,
      maxConcurrency: this.maxConcurrency,
      multipartUploadThreshold: this.multipartUploadThreshold * 1024 * 1024,
      multipartUploadSize: this.multipartUploadSize * 1024 * 1024,
      uploadSpeedLimit: this.uploadSpeedLimit,
      kodoBrowserVersion: this.kodoBrowserVersion,
    },
    params: {
      region: this.region,
      bucket: this.to.bucket,
      key: this.to.key,
      localFile: this.from.path,
      uploadedId: prog.uploadedId,
      uploadedParts: prog.uploadedParts,
      overwriteDup: !!overwrite || this.overwrite,
    }
  };

  if (this.isDebug) {
    console.log(`[JOB] sched starting => ${JSON.stringify(job)}`);
  }
  ipcRenderer.on(this.id, this._listener);
  ipcRenderer.send('asynchronous-job', job);

  this.startSpeedCounter();

  return this;
};

UploadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (this.isDebug) {
    console.log(`Pausing ${this.from.path}`);
  }

  clearInterval(this.speedTid);

  this.isStopped = true;
  this.speed = 0;
  this.predictLeftTime = 0;

  this._changeStatus("stopped");
  this.emit("stop");

  ipcRenderer.send('asynchronous-job', {
    job: this.id,
    key: 'job-stop',
  });
  ipcRenderer.removeListener(this.id, this._listener);

  return this;
};

UploadJob.prototype.wait = function () {
  if (this.status === "waiting") return;

  if (this.isDebug) {
    console.log(`Pending ${this.from.path}`);
  }

  this._lastStatusFailed = this.status === "failed";
  this.isStopped = true;

  this._changeStatus("waiting");
  this.emit("pause");

  return this;
};

/**
 * uploading
 */
UploadJob.prototype.startUpload = function (event, data) {
  if (this.isDebug) {
    console.log("[IPC MAIN]", data);
  }

  switch (data.key) {
    case 'fileDuplicated':
      ipcRenderer.removeListener(this.id, this._listener);

      this._changeStatus("duplicated");
      this.emit('fileDuplicated', data);
      break;

    case 'fileStat':
      var prog = data.data;

      this.prog.total = prog.progressTotal;
      this.prog.resumable = prog.progressResumable;
      this.emit('progress', this.prog);
      break;

    case 'progress':
      var prog = data.data;

      this.prog.loaded = prog.progressLoaded;
      this.prog.resumable = prog.progressResumable;
      this.emit('progress', this.prog);
      break;

    case 'filePartUploaded':
      var part = data.data;

      this.emit('partcomplete', part);
      break;

    case 'fileUploaded':
      ipcRenderer.removeListener(this.id, this._listener);

      this._changeStatus("finished");
      this.emit("complete");
      break;

    case 'error':
      console.error("upload object error:", data);
      ipcRenderer.removeListener(this.id, this._listener);

      this.message = data;
      this._changeStatus("failed");
      this.emit("error", data.error);
      break;

    case 'debug':
      if (!this.isDebug) {
        console.log("Debug", data);
      }
      break;

    default:
      console.warn("Unknown", data);
  }
};

UploadJob.prototype.startSpeedCounter = function () {
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

    let avgSpeed = self.prog.loaded / (new Date().getTime() - self.startedAt) * 1000;

    self.speed = self.prog.loaded - self.lastLoaded;
    if (self.speed <= 0 || (self.lastSpeed / self.speed) > 1.1) {
      self.speed = self.lastSpeed * 0.95;
    }
    if (self.speed < avgSpeed) {
      self.speed = avgSpeed;
    }
    self.lastLoaded = self.prog.loaded;
    self.lastSpeed = self.speed;

    if (self.uploadSpeedLimit && self.speed > self.uploadSpeedLimit * 1024) {
      self.speed = self.uploadSpeedLimit * 1024;
    }
    self.emit('speedchange', self.speed * 1.2);

    self.predictLeftTime =
      self.speed <= 0 ?
        0 :
        Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

UploadJob.prototype._changeStatus = function (status) {
  this.status = status;
  this.emit('statuschange', this.status);

  if (status === 'failed' || status === 'stopped' || status === 'finished' || status === 'duplicated') {
    clearInterval(this.speedTid);

    this.endedAt = new Date().getTime();
    this.speed = 0;
    this.predictLeftTime = 0;
  }
};

module.exports = UploadJob;
