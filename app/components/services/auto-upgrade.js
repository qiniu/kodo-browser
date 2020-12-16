angular.module("web").factory("autoUpgradeSvs", [
  "$timeout",
  "Customize",
  function ($timeout, Customize) {
    const NAME = "kodo-browser";
    const util = require("./node/qiniu-store/lib/util");
    const path = require("path");
    const fs = require("fs");
    const request = require("request");
    const downloadsFolder = require("downloads-folder");

    const upgrade_url = Customize.upgrade.check_url;
    const release_notes_url = Customize.upgrade.release_notes_url;
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
      stop: stop,

      compareVersion: compareVersion,
      getLastestReleaseNote: getLastestReleaseNote
    };

    var job;

    function start() {
      if (job) job.start();
    }

    function stop() {
      if (job) job.stop();
    }

    function getLastestReleaseNote(version, fn) {
      if (release_notes_url) {
        $.get(release_notes_url + version + ".md", fn);
      } else {
        $timeout(() => { fn(''); });
      }
    }

    function FlatDownloadJob(name, from, to) {
      console.log("FlatDownloadJob:", from, to);
      this.total = 0;
      this.progress = 0;
      this.name = name;
      this.from = from;
      this.to = to;

      let _statusChangeFn;
      let _progressChangeFn;
      let _request;
      let _stopped;

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
        _stopped = false;

        const that = this;

        console.log("start download ...");
        that._changeStatus("running");

        _request = request
          .head(from)
          .on("error", function (err) {
            console.error(err);
            this._changeStatus("failed", err);
          })
          .on("response", function (response) {
            if (_stopped) {
              return;
            } else if (response.statusCode == 200) {
              that.total = response.headers["content-length"];

              const to_download_target = to + ".download";
              let current = 0;

              if (fs.existsSync(to_download_target)) {
                const stat = fs.statSync(to_download_target);
                if (stat.isFile() && stat.size <= that.total) {
                  current = stat.size;
                  console.log(`resume download from ${current}`);
                } else {
                  fs.unlinkSync(to_download_target);
                }
              }

              that.progress = Math.round(current * 10000 / that.total) / 100;

              var ws = fs.createWriteStream(to_download_target, {
                flags: fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NONBLOCK,
                start: current
              });

              _request = request({url: from, headers: { 'Range': `bytes=${current}-` }})
                .on("error", function (err) {
                  if (_stopped) {
                    return;
                  }
                  console.error(err);
                  that._changeStatus("failed", err);
                })
                .on("data", function (chunk) {
                  if (_stopped) {
                    throw new Error('Manually Stopped, Just ignore this exception');
                  }
                  current += chunk.length;
                  that.progress =
                    Math.round(current * 10000 / that.total) / 100;
                  that._changeProgress(that.progress);
                  return chunk;
                })
                .pipe(ws)
                .on("finish", function () {
                  if (_stopped) {
                    return;
                  }
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
      this.stop = function() {
        _stopped = true;
        this._changeStatus("stopped");
        if (_request) {
          _request.end();
          _request.destroy();
          _request = null;
        }
      }
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
        $timeout(() => { fn(fallback, true); });
        return;
      }

      $.ajax(upgrade_url, {
        cache: false,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
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
              fn(fallback, true);
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

            fn(upgradeOpt, true);
          } else {
            fn(fallback, true);
          }
        },
        error: function(xhr, _, error) {
          console.error(error);
          fn(fallback, false);
        },
      });
    }

    function compareVersion(curV, lastV) {
      var arr = curV.split(".");
      var arr2 = lastV.split(".");

      var len = Math.max(arr.length, arr2.length);

      for (var i = 0; i < len; i++) {
        var a = parseInt(arr[i]) || 0;
        var b = parseInt(arr2[i]) || 0;

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
