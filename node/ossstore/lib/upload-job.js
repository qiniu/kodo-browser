"use strict";

const AWS = require("aws-sdk");

var fs = require("fs");
var path = require("path");
var mime = require("mime");
var util = require("./util");
var Base = require("./base");
var isDebug = process.env.NODE_ENV == "development";

class UploadJob extends Base {
  /**
   *
   * @param osClient
   * @param config
   *    config.from {object|string}  {name, path} or /home/admin/a.jpg
   *    config.to   {object|string}  {bucket, key} or kodo://bucket/test/a.jpg
   *
   *    config.prog   {object}  {loaded, total}
   *    config.status     {string} default 'waiting'
   *
   * events:
   *    statuschange(state) 'running'|'waiting'|'stopped'|'failed'|'finished'
   *    stopped
   *    error  (err)
   *    complete
   *    progress ({loaded:0, total: 1200})
   *    partcomplete  ({done: c, total: total}, checkPoint)
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
      "uj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);

    this.client = osClient;
    this.region = this._config.region;

    this.from = util.parseLocalPath(this._config.from);
    this.to = util.parseS3Path(this._config.to);

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

UploadJob.prototype.start = function() {
  if (self.status == "running") return;

  if (isDebug) {
    console.log("Trying upload ", this.from.path, " to ", this.to.key);
  }

  this.message = "";
  this.startTime = new Date().getTime();
  this.endTime = null;
  this._changeStatus("running");
  this.stopFlag = false;
  this._hasCallComplete = false;

  // start
  this.startUpload();
  this.startSpeedCounter();

  return this;
};

UploadJob.prototype.stop = function() {
  if (this.status == "stopped") return;

  if (isDebug) {
    console.log("Pausing upload ", this.from.path);
  }

  clearInterval(this.speedTid);

  this.stopFlag = true;
  this._changeStatus("stopped");
  this.speed = 0;
  this.predictLeftTime = 0;

  return this;
};

UploadJob.prototype.wait = function() {
  if (this.status == "waiting") return;

  if (isDebug) {
    console.log("Pendding upload ", this.from.path);
  }

  this._lastStatusFailed = this.status == "failed";
  this._changeStatus("waiting");
  this.stopFlag = true;

  return this;
};

UploadJob.prototype.deleteFile = function() {
  var self = this;

  var params = { Bucket: self.to.bucket, Key: self.to.key };

  self.oss.deleteObject(params, function(err) {
    if (err) {
      console.error(
        "Delete [kodo://" + self.to.bucket + "/" + self.to.key + "]",
        err
      );
    } else {
      console.log(
        "[kodo://" + self.to.bucket + "/" + self.to.key + "] is deleted"
      );
    }
  });
};

UploadJob.prototype._changeStatus = function(status) {
  var self = this;

  self.status = status;
  self.emit("statuschange", self.status);

  if (status == "failed" || status == "stopped" || status == "finished") {
    clearInterval(self.speedTid);

    self.endTime = new Date().getTime();
    self.speed = 0;
    self.predictLeftTime = 0; //推测耗时
  }
};

/**
 * 开始上传
 */
UploadJob.prototype.startUpload = function() {
  var self = this;

  if (isDebug) {
    console.log("Starting upload ", self.from.path);
  }

  fs.stat(self.from.path, function(err, state) {
    if (err) {
      self.message = err.message;
      self._changeStatus("failed");
      self.emit("error", err);
      return;
    }

    self.prog = {
      loaded: 0,
      total: state.size
    };

    var stream = fs.createReadStream(self.from.path);

    var params = {
      Bucket: self.to.bucket,
      Key: self.to.key,
      Body: stream,
      ContentType: mime.lookup(self.from.path)
    };

    var uploader = new AWS.S3.ManagedUpload({
      service: self.client,
      params: params,
      partSize: 8 << 20, // 8M
      queueSize: self.maxConcurrency,
      leavePartsOnError: true,
      computeChecksums: true
    });

    uploader.on("httpUploadProgress", function(prog) {
      if (self.stopFlag) {
        try {
          uploader.abort();
        } catch (e) {}

        return;
      }

      self.prog.loaded = prog.loaded;
      self.emit("progress", JSON.parse(JSON.stringify(self.prog)));
    });

    uploader.send(function(err, data) {
      // always close opened stream
      stream.close();

      if (err) {
        console.warn("put object error:", err);

        self.message = err.message;
        self._changeStatus("failed");
        self.emit("error", err);

        return;
      }

      self._changeStatus("finished");
    });
  });
};

UploadJob.prototype.startSpeedCounter = function() {
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

module.exports = UploadJob;
