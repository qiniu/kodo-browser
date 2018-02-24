"use strict";

var fs = require("fs"),
  path = require("path"),
  util = require("./util"),
  ioutil = require("./ioutil"),
  Base = require("./base");
var isDebug = process.env.NODE_ENV == "development";

class DownloadJob extends Base {
  /**
   *
   * @param osClient
   * @param config
   *    config.from {object|string}  {bucket, key} or kodo://bucket/test/a.jpg
   *    config.to   {object|string}  {name, path} or /home/admin/a.jpg
   *
   */
  constructor(osClient, config) {
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

    this.id =
      "dj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);

    this.client = osClient;
    this.region = this._config.region;
    this.resumePoints = this._config.resumePoints;

    this.from = util.parseS3Path(this._config.from); //s3 path
    this.to = util.parseLocalPath(this._config.to); //local path

    this.prog = this._config.prog || {
      total: 0,
      loaded: 0
    };

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
    this.maxConcurrency = 10;
  }
}

DownloadJob.prototype.start = function () {
  if (this.status == "running") return;

  this.message = "";
  this.startTime = new Date().getTime();
  this.endTime = null;

  this.stopFlag = false;
  this._changeStatus("running");

  // start
  this.startDownload(this.resumePoints);
  this.startSpeedCounter();

  return this;
};

DownloadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (isDebug) {
    console.log(`Pausing s3://${this.from.bucket}/${this.from.key}`);
  }

  clearInterval(this.speedTid);

  this._changeStatus("stopped");
  this.stopFlag = true;

  this.speed = 0;
  this.predictLeftTime = 0;

  return this;
};

DownloadJob.prototype.wait = function () {
  if (this.status == "waiting") return;

  if (isDebug) {
    console.log(`Pendding s3://${this.from.bucket}/${this.from.key}`);
  }

  this._lastStatusFailed = this.status == "failed";
  this._changeStatus("waiting");
  this.stopFlag = true;

  return this;
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

/**
 * downloading
 */
DownloadJob.prototype.startDownload = function (checkPoints) {
  var self = this;

  if (isDebug) {
    console.log(`Start downloading s3://${self.from.bucket}/${self.from.key}`);
  }

  var client = ioutil.createClient({
    s3Client: self.client,
    s3MaxAsync: self.maxConcurrency,
    multipartDownloadThreshold: 100 << 20, // 100M
    multipartDownloadSize: 16 << 20 // 16M
  });

  var tmpfile = self.to.path + ".download";

  var params = {
    s3Params: {
      Bucket: self.from.bucket,
      Key: self.from.key
    },
    localFile: tmpfile,
    isDebug: isDebug
  };

  var downloader = client.downloadFile(params);
  downloader.on('fileStat', function (e2) {
    self.prog.total = e2.progressTotal;
    self.emit('progress', self.prog);
  });
  downloader.on('progress', function (e2) {
    self.prog.total = e2.progressTotal;
    self.prog.loaded = e2.progressAmount;
    self.emit('progress', self.prog);
  });
  downloader.on('fileDownloaded', function (data) {
    self._changeStatus("verifying");

    fs.rename(tmpfile, self.to.path, function (err) {
      if (err) {
        console.error("rename file error:", err);

        self._changeStatus("failed");
        self.emit("error", err);
      } else {
        self._changeStatus("finished");
        self.emit("complete");
      }
    });
  });
  downloader.on('error', function (err) {
    console.warn("download object error:", err);

    self.message = err.message;
    self._changeStatus("failed");
    self.emit("error", err);
  });
};

DownloadJob.prototype.startSpeedCounter = function () {
  var self = this;

  self.lastLoaded = self.prog.loaded || 0;
  self.lastSpeed = 0;

  clearInterval(self.speedTid);
  self.speedTid = setInterval(function () {
    if (self.stopFlag) {
      self.speed = 0;
      self.predictLeftTime = 0;
      return;
    }

    self.speed = self.prog.loaded - self.lastLoaded;
    if (self.speed === 0) {
      self.speed = self.lastSpeed * 0.8;
    }
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed);
    }

    self.lastSpeed = self.speed;
    self.lastLoaded = self.prog.loaded;

    self.predictLeftTime =
      self.speed == 0 ?
      0 :
      Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

module.exports = DownloadJob;