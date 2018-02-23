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

    this.from = util.parseS3Path(this._config.from); //s3 path
    this.to = util.parseLocalPath(this._config.to); //local path

    this.prog = this._config.prog || {
      loaded: 0,
      total: 0
    };

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
    this.maxConcurrency = 10;
  }
}

DownloadJob.prototype.start = function () {
  var self = this;
  if (self.status == "running") return;

  self.message = "";
  self.startTime = new Date().getTime();
  self.endTime = null;

  self.stopFlag = false;
  self._changeStatus("running");

  self.startDownload(self.checkPoints);
  self.startSpeedCounter();

  return self;
};

DownloadJob.prototype.stop = function () {
  var self = this;
  if (self.status == "stopped") return;

  self.stopFlag = true;
  self._changeStatus("stopped");
  self.speed = 0;
  self.predictLeftTime = 0;

  return self;
};

DownloadJob.prototype.wait = function () {
  var self = this;
  if (this.status == "waiting") return;

  this._lastStatusFailed = this.status == "failed";
  self.stopFlag = true;
  self._changeStatus("waiting");

  return self;
};

DownloadJob.prototype._changeStatus = function (status) {
  var self = this;
  self.status = status;
  self.emit("statuschange", self.status);

  if (status == "failed" || status == "stopped" || status == "finished") {
    self.endTime = new Date().getTime();

    clearInterval(self.speedTid);

    self.speed = 0;
    self.predictLeftTime = 0;
  }
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
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed);
    }

    self.lastSpeed = self.speed;
    self.lastLoaded = self.prog.loaded;

    //推测耗时
    self.predictLeftTime =
      self.speed == 0 ?
      0 :
      Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

/**
 * 开始download
 */
DownloadJob.prototype.startDownload = function (checkPoints) {
  var self = this;

  if (isDebug) {
    console.log(`Starting download s3://${self.from.bucket}/${self.from.key}`);
  }

  self.prog = {
    loaded: 0,
    total: 0
  };

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
    console.warn("get object error:", err);

    self.message = err.message;
    self._changeStatus("failed");
    self.emit("error", err);
  });
};

module.exports = DownloadJob;