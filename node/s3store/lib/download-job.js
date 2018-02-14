"use strict";

const AWS = require("aws-sdk");
const S3Download = require("s3-download");

var fs = require("fs");
var path = require("path");
var util = require("./util");
var Base = require("./base");

class DownloadJob extends Base {
  /**
   *
   * @param osClient
   * @param config
   *    config.from {object|string}  {bucket, key} or kodo://bucket/test/a.jpg
   *    config.to   {object|string}  {name, path} or /home/admin/a.jpg
   *
   *    config.checkPoint
   *    config.chunkSize
   *    config.enableCrc64
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

DownloadJob.prototype.start = function() {
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

DownloadJob.prototype.stop = function() {
  var self = this;
  if (self.status == "stopped") return;

  self.stopFlag = true;
  self._changeStatus("stopped");
  self.speed = 0;
  self.predictLeftTime = 0;

  return self;
};

DownloadJob.prototype.wait = function() {
  var self = this;
  if (this.status == "waiting") return;

  this._lastStatusFailed = this.status == "failed";
  self.stopFlag = true;
  self._changeStatus("waiting");

  return self;
};

DownloadJob.prototype._changeStatus = function(status) {
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

DownloadJob.prototype.startSpeedCounter = function() {
  var self = this;

  self.lastLoaded = self.prog.loaded || 0;
  self.lastSpeed = 0;

  clearInterval(self.speedTid);
  self.speedTid = setInterval(function() {
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
      self.speed == 0
        ? 0
        : Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

/**
 * 开始download
 */
DownloadJob.prototype.startDownload = function(checkPoints) {
  var self = this;

  var params = { Bucket: self.from.bucket, Key: self.from.key };

  self.client.headObject(params, function(err, metadata) {
    if (err) {
      if (
        err.message.indexOf("Network Failure") != -1 ||
        err.message.indexOf("getaddrinfo ENOTFOUND") != -1
      ) {
        self.message = "failed to get object meta: " + err.message;
        console.error(self.message, self.to.path);

        self.stop();
      } else {
        self.message = "failed to get object meta: " + err.message;
        console.error(self.message, self.to.path);

        self._changeStatus("failed");
        self.emit("error", err);
      }

      return;
    }

    self.prog = {
      loaded: 0,
      total: metadata.ContentLength
    };

    var tmpfile = self.to.path + ".download";
    var stream = fs.createWriteStream(tmpfile);
    var downloader = new S3Download(self.client);

    var s3io = downloader.download(params, {
      maxPartSize: 8 << 20, // 8M
      concurrentStreams: self.concurrency,
      maxRetries: 3,
      totalObjectSize: metadata.ContentLength
    });
    s3io.on("part", function(length) {
      self.prog.loaded += length;
      self.emit("progress", self.prog);
    });
    s3io.on("downloaded", function(data) {
      self._changeStatus("verifying");

      //util.checksumFile(tmpfile, metadata.ETag, function(err) {
      //  if (err) {
      //    self.message = err.message || err;
      //    console.error(self.message, self.to.path);

      //    self._changeStatus("failed");
      //    self.emit("error", err);
      //    return;
      //  }

        // 临时文件重命名为正式文件
        fs.rename(tmpfile, self.to.path, function(err) {
          if (err) {
            console.error("rename to ", self.to.path, err);
          } else {
            self._changeStatus("finished");

            self.emit("partcomplete", {
              total: metadata.ContentLength,
              done: metadata.ContentLength
            });
            self.emit("complete");

            console.log(
              "download: " + self.to.path + " %celapse",
              "background:green;color:white",
              self.endTime - self.startTime,
              "ms"
            );
          }
        });
      //});
    });
    s3io.on("error", function(err) {
      self._changeStatus("failed");
      self.emit("error", err);
    });

    s3io.pipe(stream);
  });
};

module.exports = DownloadJob;
