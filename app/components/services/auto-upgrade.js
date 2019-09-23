angular.module("web").factory("autoUpgradeSvs", [
  function () {
    const NAME = "kodo-browser";
    const util = require("./node/s3store/lib/util");
    const path = require("path");
    const fs = require("fs");
    const request = require("request");
    const downloadsFolder = require("downloads-folder");

    const release_notes_url = Global.release_notes_url;
    const upgrade_url = Global.upgrade_url;
    const gVersion = Global.app.version;

    var upgradeOpt = {
      currentVersion: gVersion,
      isLastVersion: false,
      lastVersion: gVersion,
      fileName: "",
      link: "",
      upgradeJob: {
        pkgLink: "",
        progress: 0,
        status: "waiting"
      }
    };

    return {
      load: load,
      start: start,

      compareVersion: compareVersion,
      getReleaseNote: getReleaseNote,
      getLastestReleaseNote: getLastestReleaseNote
    };

    var job;

    function start() {
      if (job) job.start();
    }

    function getReleaseNote(version, fn) {
      $.get("release-notes/" + version + ".md", fn);
    }

    //获取最新releaseNote
    function getLastestReleaseNote(version, fn) {
      $.get(release_notes_url + version + ".md", fn);
    }

    function FlatDownloadJob(name, from, to) {
      console.log("FlatDownloadJob:", from, to);
      this.total = 0;
      this.progress = 0;
      this.name = name;
      this.from = from;
      this.to = to;

      var _statusChangeFn;
      var _progressChangeFn;

      this.update = function () {
        //copy
        console.log("copy:", __dirname);
        fs.renameSync(to + ".download", to);
        this._changeStatus("finished");
      };
      this.check = function (expected, callback) {
        //crc
        console.log("etag check");
        return util.getEtag(to + ".download", function(actual) {
          if (expected !== `"${actual}"`) {
            callback(new Error(`Etag check failed, expected: ${expected}, actual: "${actual}"`));
          } else {
            callback();
          }
        });
      };

      this.precheck = function () {
        this.progress = 0;
        this.total = 0;

        if (fs.existsSync(to)) {
          console.log("exists, done");
          this.progress = 100;
          this._changeStatus("finished");
          return false;
        }
        return true;
      };

      this.start = function () {
        if (!this.precheck()) {
          return;
        }
        let that = this;

        if (fs.existsSync(to + ".download")) {
          fs.unlinkSync(to + ".download");
        }

        console.log("start download ...");
        that._changeStatus("running");

        request
          .head(from)
          .on("error", function (err) {
            console.error(err);
            this._changeStatus("failed", err);
          })
          .on("response", function (response) {
            if (response.statusCode == 200) {
              that.total = response.headers["content-length"];
              var current = 0;
              that.progress = Math.round(current * 10000 / that.total) / 100;

              var ws = fs.createWriteStream(to + ".download", { flags: "w" });

              request(from)
                .on("error", function (err) {
                  console.error(err);
                  that._changeStatus("failed", err);
                })
                .on("data", function (chunk) {
                  current += chunk.length;
                  that.progress =
                    Math.round(current * 10000 / that.total) / 100;
                  that._changeProgress(that.progress);
                  return chunk;
                })
                .pipe(ws)
                .on("finish", function () {
                  that._changeStatus("verifying");

                  that.check(
                    response.headers["etag"],
                    function (err) {
                      if (err) {
                        console.error("check error:", err);
                        that._changeStatus("failed", err);
                      } else {
                        that.update();
                      }
                    }
                  );
                });
            } else {
              console.error('download upgrade package error', response.statusCode, response.statusMessage, response.headers);
              that._changeStatus("failed", response);
            }
          });
      };
      this.onProgressChange = function (fn) {
        _progressChangeFn = fn;
      };
      this.onStatusChange = function (fn) {
        _statusChangeFn = fn;
      };
      this._changeStatus = function (status, err) {
        this.status = status;
        this.message = err;
        if (_statusChangeFn) _statusChangeFn(status);
      };
      this._changeProgress = function (prog) {
        if (_progressChangeFn) _progressChangeFn(prog);
      };
    }

    function load(fn) {
      const fallback = {
        currentVersion: Global.app.version,
        isLastVersion: true,
        lastVersion: Global.app.version,
        fileName: "",
        link: "",
        localPath: ""
      };
      if (!upgrade_url) {
        fn(fallback);
        return;
      }

      $.getJSON(upgrade_url).done(function (data) {
        const isLastVersion = compareVersion(gVersion, data.version) >= 0;
        const lastVersion = data.version;
        let downloadUrl = '';

        upgradeOpt.isLastVersion = isLastVersion;
        upgradeOpt.lastVersion = lastVersion;

        if (!isLastVersion && data.downloads) {
          try {
            downloadUrl = data.downloads[process.platform][process.arch];
          } catch (e) {
            console.error(e);
            fn(fallback);
            return;
          }

          let jobs = [];
          let fileName = decodeURIComponent(path.basename(downloadUrl));

          upgradeOpt.fileName = fileName;
          upgradeOpt.localPath = path.join(downloadsFolder(), fileName);
          upgradeOpt.link = downloadUrl;
          upgradeOpt.upgradeJob.status = "waiting";
          upgradeOpt.upgradeJob.progress = 0;
          upgradeOpt.upgradeJob.pkgLink = downloadUrl;

          job = new FlatDownloadJob(fileName, downloadUrl, upgradeOpt.localPath);

          job.onStatusChange(function (status) {
            upgradeOpt.upgradeJob.status = status;
          });
          job.onProgressChange(function (progress) {
            upgradeOpt.upgradeJob.progress = progress;
          });
          job.precheck();

          fn(upgradeOpt);
          return;
        }
        fn(fallback);
      }).fail(function(xhr, _, error) {
        console.error(error);
        fn(fallback);
      });
    }

    function compareVersion(curV, lastV) {
      var arr = curV.split(".");
      var arr2 = lastV.split(".");

      var len = Math.max(arr.length, arr2.length);

      for (var i = 0; i < len; i++) {
        var a = parseInt(arr[i]);
        var b = parseInt(arr2[i]);

        if (a > b) {
          return 1;
        } else if (a < b) {
          return -1;
        }
      }
      return 0;
    }
  }
]);
