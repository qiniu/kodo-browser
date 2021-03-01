angular.module("web").factory("DownloadMgr", [
  "$q",
  "$timeout",
  "AuthInfo",
  "QiniuClient",
  "Config",
  "Toast",
  "settingsSvs",
  function (
    $q,
    $timeout,
    AuthInfo,
    QiniuClient,
    Config,
    Toast,
    settingsSvs
  ) {
    const fs = require("fs"),
          http = require("http"),
          https = require("https"),
          pfs = fs.promises,
          path = require("path"),
          os = require("os"),
          sanitize = require("sanitize-filename"),
          QiniuStore = require("./node/qiniu-store"),
          { KODO_MODE } = require('kodo-s3-adapter-sdk');

    var $scope;
    var concurrency = 0;
    var stopCreatingFlag = false;

    return {
      init: init,
      createDownloadJobs: createDownloadJobs,
      trySchedJob: trySchedJob,
      trySaveProg: trySaveProg,

      stopCreatingJobs: () => {
        stopCreatingFlag = true;
      }
    };

    function init(scope) {
      $scope = scope;
      $scope.lists.downloadJobList = [];

      tryLoadProg().then((progs) => {
        angular.forEach(progs, (prog) => {
          const job = createJob(prog);
          if (job.status === "waiting" || job.status === "running") {
            job.stop();
          }
          addEvents(job);
        });
      });
    }

    /**
     * @param  opt { region, from, to, ...}
     * @param  opt.from {bucket, key}
     * @param  opt.to   {name, path}
     * @return job  { start(), stop(), status, progress }
     */
    function createJob(options) {
      const bucket = options.from.bucket,
            key = options.from.key,
            region = options.region,
            domain = options.domain;

      console.info(
        "GET",
        "::",
        region,
        "::",
        bucket + "/" + key,
        "==>",
        options.to.path + "/" + options.to.name
      );

      const config = Config.load();

      options.clientOptions = {
        accessKey: AuthInfo.get().id,
        secretKey: AuthInfo.get().secret,
        ucUrl: config.ucUrl,
        regions: config.regions || [],
      };
      options.region = region;
      options.domain = domain;
      options.resumeDownload = (settingsSvs.resumeDownload.get() == 1);
      options.multipartDownloadThreshold = settingsSvs.multipartDownloadThreshold.get();
      options.multipartDownloadSize = settingsSvs.multipartDownloadSize.get();
      options.downloadSpeedLimit = (settingsSvs.downloadSpeedLimitEnabled.get() == 1 && settingsSvs.downloadSpeedLimitKBperSec.get());
      options.isDebug = (settingsSvs.isDebug.get() == 1);

      const store = new QiniuStore();
      return store.createDownloadJob(options);
    }

    /**
     * 下载
     * @param bucketInfos {array}  item={region, bucket, path, name, size=0, itemType='file'}  有可能是目录，需要遍历
     * @param toLocalPath {string}
     * @param jobsAddedFn {Function} 加入列表完成回调方法， jobs列表已经稳定
     */
    function createDownloadJobs(bucketInfos, toLocalPath, jobsAddedFn) {
      stopCreatingFlag = false;

      var dirPath = path.dirname(bucketInfos[0].path);

      loop(bucketInfos, (jobs) => {}, () => {
        if (jobsAddedFn) {
          jobsAddedFn();
        }
      });

      function loop(arr, callFn, callFn2) {
        var t = [];
        var len = arr.length;
        var c = 0;
        var c2 = 0;

        if (len == 0) {
          callFn(t);
          callFn2(t);
          return;
        }

        _kdig();

        function _kdig() {
          dig(arr[c], t, () => {

          }, () => {
            c2++;
            if (c2 >= len) {
              callFn2(t);
            }
          });

          c++;
          if (c == len) {
            callFn(t);
          } else {
            if (stopCreatingFlag) {
              return;
            }

            $timeout(_kdig, 10);
          }
        }
      }

      function dig(qiniuInfo, t, callFn, callFn2) {
        if (stopCreatingFlag) {
          return;
        }

        var fileName = sanitize(path.basename(qiniuInfo.path)),
          filePath = "";
        if (path.sep == "\\") {
          angular.forEach(path.relative(dirPath.replace(/\\/g, "/"), qiniuInfo.path).replace(/\\/g, "/").split("/"), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        } else {
          angular.forEach(path.relative(dirPath, qiniuInfo.path).split("/"), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        }

        if (qiniuInfo.itemType === 'folder') {
          // list all files under qiniuInfo.path
          function tryLoadFiles(marker) {
            QiniuClient
              .listFiles(qiniuInfo.region, qiniuInfo.bucket, qiniuInfo.path, marker, {
                maxKeys: 1000,
                minKeys: 0,
              })
              .then((result) => {
                var files = result.data;
                files.forEach((f) => {
                  f.region = qiniuInfo.region;
                  f.bucket = qiniuInfo.bucket;
                  f.domain = qiniuInfo.domain;
                  f.qiniuBackendMode = qiniuInfo.qiniuBackendMode;
                });

                loop(files, (jobs) => {
                  t = t.concat(jobs);
                  if (result.marker) {
                    $timeout(() => { tryLoadFiles(result.marker); }, 10);
                  } else {
                    if (callFn) callFn();
                  }
                }, callFn2);
              });
          }

          tryLoadFiles();
        } else {
          var fileFolders = "";
          if (path.sep == "\\") {
            fileFolders = path.dirname(filePath.replace(/\\/g, "/")).split("/");
          } else {
            fileFolders = path.dirname(filePath.replace(path.sep, "/")).split("/");
          }

          fileFolders.reduce((prevPromise, folder) => {
            return prevPromise.then((localFolder) => {
              var absfolder = path.join(localFolder, folder);

              return pfs.stat(absfolder).then((stat) => {
                if (stat.isDirectory()) {
                  return Promise.resolve(absfolder);
                }

                return pfs.mkdir(absfolder).then(() => {
                  return Promise.resolve(absfolder);
                }).catch((err) => {
                  if (err.message.indexOf('EEXIST: file already exists') > -1) {
                    return Promise.resolve(absfolder);
                  }

                  throw err;
                });
              }).catch((err) => {
                return pfs.mkdir(absfolder).then(() => {
                  return Promise.resolve(absfolder);
                }).catch((err) => {
                  if (err.message.indexOf('EEXIST: file already exists') > -1) {
                    return Promise.resolve(absfolder);
                  }

                  throw err;
                });
              });
            });
          }, Promise.resolve(toLocalPath)).then((localPath) => {
            const ext = path.extname(fileName);
            const fileLocalPathWithoutExt = path.normalize(path.join(localPath, path.basename(fileName, ext)));
            let fileLocalPathWithSuffixWithoutExt = fileLocalPathWithoutExt

            if (!$scope.overwriteDownloading.enabled) {
              for (let i = 1; fs.existsSync(fileLocalPathWithSuffixWithoutExt + ext); i++) {
                fileLocalPathWithSuffixWithoutExt = `${fileLocalPathWithoutExt}.${i}`;
              }
            }

            const job = createJob({
              region: qiniuInfo.region,
              from: {
                bucket: qiniuInfo.bucket,
                key: qiniuInfo.path,
                size: qiniuInfo.size,
                mtime: qiniuInfo.lastModified.toISOString(),
              },
              to: {
                name: fileName,
                path: fileLocalPathWithSuffixWithoutExt + ext
              },
              domain: qiniuInfo.domain.toQiniuDomain(),
              backendMode: qiniuInfo.domain.qiniuBackendMode(),
            });
            addEvents(job);
            t.push(job);

            if (callFn) callFn();
            if (callFn2) callFn2();
          });
        }
      }
    }

    function addEvents(job) {
      if (!job.downloadedParts) {
        job.downloadedParts = [];
      }

      $scope.lists.downloadJobList.push(job);

      trySchedJob();
      trySaveProg();

      $timeout(() => {
        $scope.calcTotalProg();
      });

      job.on("partcomplete", (prog) => {
        trySaveProg();
      });
      job.on("statuschange", (status) => {
        if (status == "stopped") {
          concurrency--;
          trySchedJob();
        }

        trySaveProg();

        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
      job.on("speedchange", () => {
        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
      job.on("complete", () => {
        concurrency--;
        trySchedJob();

        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
      job.on("error", (err) => {
        if (err) {
          console.error(`download kodo://${job.from.bucket}/${job.from.key} error: ${err}`);
        }

        concurrency--;
        trySchedJob();

        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
    }

    function trySchedJob() {
      var maxConcurrency = settingsSvs.maxDownloadConcurrency.get();
      var isDebug = (settingsSvs.isDebug.get() == 1);

      concurrency = Math.max(0, concurrency);
      if (isDebug) {
        console.log(`[JOB] download max: ${maxConcurrency}, cur: ${concurrency}, jobs: ${$scope.lists.downloadJobList.length}`);
      }

      if (concurrency < maxConcurrency) {
        var jobs = $scope.lists.downloadJobList;

        for (var i = 0; i < jobs.length; i++) {
          if (concurrency >= maxConcurrency) return;

          var job = jobs[i];
          if (isDebug) {
            console.log(`[JOB] sched ${job.status} => ${JSON.stringify(job._config)}`);
          }

          if (job.status == "waiting") {
            concurrency++;

            if (job.prog.resumable) {
              tryLoadProg().then((progs) => {
                if (progs && progs[job.id]) {
                  job.start(progs[job.id]);
                } else {
                  job.start();
                }
              });
            } else {
              job.start();
            }
          }
        }
      }
    }

    function trySaveProg() {
      var t = {};
      angular.forEach($scope.lists.downloadJobList, function (job) {
        if (job.status == "finished") return;

        t[job.id] = {
          region: job.region,
          to: job.to,
          from: job.from,
          prog: {
            synced: job.prog.synced,
            total: job.prog.total,
            resumable: job.prog.resumable
          },
          backendMode: job.backendMode,
          domain: job.domain,
          status: job.status,
          message: job.message,
        };
      });

      fs.writeFileSync(getDownProgFilePath(), JSON.stringify(t));
    }

    /**
     * resolve prog saved
     */
    function tryLoadProg() {
      let progs = {};
      try {
        const data = fs.readFileSync(getDownProgFilePath());
        progs = JSON.parse(data);
      } catch (e) {}

      const promises = Object.entries(progs).map(([jobId, job]) => {
        return new Promise((resolve) => {
          const options = { ignoreError: true };
          if (job.backendMode == KODO_MODE) {
            options.preferKodoAdapter = true;
          } else {
            options.preferS3Adapter = true;
          }
          QiniuClient.headFile(job.region, job.from.bucket, job.from.key, options).then((info) => {
            if (info.size !== job.from.size || info.lastModified.toISOString() !== job.from.mtime) {
              if (job.prog) {
                delete job.prog.synced;
              }
            }
            resolve();
          }).catch(() => {
            if (job.prog) {
              delete job.prog.synced;
            }
            resolve();
          });
        });
      });

      return new Promise((resolve) => {
        Promise.all(promises).then(() => { resolve(progs); });
      });
    }

    // prog save path
    function getDownProgFilePath() {
      var folder = Global.config_path;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      var username = AuthInfo.get().id || "kodo-browser";
      return path.join(folder, "downprog_" + username + ".json");
    }
  }
]);
