angular.module("web").factory("s3DownloadMgr", [
  "$q",
  "$timeout",
  "AuthInfo",
  "s3Client",
  "Config",
  "Toast",
  "settingsSvs",
  function (
    $q,
    $timeout,
    AuthInfo,
    s3Client,
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
          S3Store = require("./node/s3store");

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

      const progs = tryLoadProg();
      angular.forEach(progs, (prog) => {
        createJob(prog).then((job) => {
          if (job.status == "waiting" || job.status == "running") {
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
      const df = $q.defer(),
            auth = AuthInfo.get(),
            bucket = options.from.bucket,
            key = options.from.key,
            region = options.region || auth.region;

      s3Client.getClient({ bucket: bucket, region: region }).then((client) => {
        console.info(
          "GET",
          "::",
          region,
          "::",
          bucket + "/" + key,
          "==>",
          options.to.path + "/" + options.to.name
        );
        options.region = region;
        options.resumeDownload = (settingsSvs.resumeDownload.get() == 1);
        options.multipartDownloadThreshold = settingsSvs.multipartDownloadThreshold.get();
        options.multipartDownloadSize = settingsSvs.multipartDownloadSize.get();
        options.downloadSpeedLimit = (settingsSvs.downloadSpeedLimitEnabled.get() == 1 && settingsSvs.downloadSpeedLimitKBperSec.get());
        options.useElectronNode = (settingsSvs.useElectronNode.get() == 1);
        options.isDebug = (settingsSvs.isDebug.get() == 1);
        if (!options.url) {
          options.url = client.getSignedUrl("getObject", { Bucket: bucket, Key: key, Expires: 24 * 60 * 60 * 7 });
        }

        const agentOptions = { keepAlive: true, keepAliveMsecs: 30000 };
        const store = new S3Store({
          credential: {
            accessKeyId: auth.id,
            secretAccessKey: auth.secret
          },
          endpoint: client.config.endpoint,
          region: region,
          httpOptions: {
            connectTimeout: 3000, // 3s
            timeout: 300000, // 5m
            agent: client.config.endpoint.startsWith('https://') ? new https.Agent(agentOptions) : new http.Agent(agentOptions)
          }
        });
        df.resolve(store.createDownloadJob(options));
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    /**
     * 下载
     * @param bucketInfos {array}  item={region, bucket, path, name, size=0, isFolder=false}  有可能是目录，需要遍历
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

      function dig(s3info, t, callFn, callFn2) {
        if (stopCreatingFlag) {
          return;
        }

        var fileName = sanitize(path.basename(s3info.path)),
          filePath = "";
        if (path.sep == "\\") {
          angular.forEach(path.relative(dirPath.replace(/\\/g, "/"), s3info.path).replace(/\\/g, "/").split("/"), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        } else {
          angular.forEach(path.relative(dirPath, s3info.path).split("/"), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        }

        if (s3info.isFolder) {
          // list all files under s3info.path
          function tryLoadFiles(marker) {
            s3Client
              .listFiles(s3info.region, s3info.bucket, s3info.path, marker)
              .then((result) => {
                var files = result.data;
                files.forEach((f) => {
                  f.region = s3info.region;
                  f.bucket = s3info.bucket;
                  f.domain = s3info.domain;
                });

                loop(files, (jobs) => {
                  t = t.concat(jobs);
                  if (result.marker) {
                    $timeout(() => {
                      tryLoadFiles(result.marker);
                    }, 10);
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

            s3info.domain.signatureUrl(s3info.path).then((url) => {
              createJob({
                region: s3info.region,
                from: {
                  bucket: s3info.bucket,
                  key: s3info.path,
                  url: url
                },
                to: {
                  name: fileName,
                  path: fileLocalPathWithSuffixWithoutExt + ext
                }
              }).then((job) => {
                addEvents(job);
                t.push(job);

                if (callFn) callFn();
                if (callFn2) callFn2();
              });
            });
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
              var progs = tryLoadProg();
              if (progs && progs[job.id]) {
                job.start(progs[job.id]);
              } else {
                job.start();
              }
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
          status: job.status,
          message: job.message
        };
      });

      fs.writeFileSync(getDownProgFilePath(), JSON.stringify(t));
    }

    /**
     * resolve prog saved
     */
    function tryLoadProg() {
      try {
        var data = fs.readFileSync(getDownProgFilePath());

        return JSON.parse(data ? data.toString() : "[]");
      } catch (e) {}

      return [];
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
