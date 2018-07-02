angular.module("web").factory("s3DownloadMgr", [
  "$state",
  "$timeout",
  "AuthInfo",
  "s3Client",
  "Toast",
  "Const",
  "safeApply",
  "settingsSvs",
  function (
    $state,
    $timeout,
    AuthInfo,
    s3Client,
    Toast,
    Const,
    safeApply,
    settingsSvs
  ) {
    var fs = require("fs"),
      path = require("path"),
      os = require("os"),
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

      var auth = AuthInfo.get();
      var progs = tryLoadProg();

      angular.forEach(progs, (prog) => {
        var job = createJob(auth, prog);
        if (job.status == "waiting" || job.status == "running") {
          job.stop();
        }

        addEvents(job);
      });
    }

    /**
     * @param  auth {id, secret}
     * @param  opt { region, from, to, ...}
     * @param  opt.from {bucket, key}
     * @param  opt.to   {name, path}
     * @return job  { start(), stop(), status, progress }
     */
    function createJob(auth, options) {
      var region = options.region || auth.region || "cn-east-1";

      options.region = region;
      options.resumeDownload = (settingsSvs.resumeDownload.get() == 1);
      options.multipartDownloadThreshold = settingsSvs.multipartDownloadThreshold.get();
      options.multipartDownloadSize = settingsSvs.multipartDownloadSize.get();
      options.useElectronNode = (settingsSvs.useElectronNode.get() == 1);
      options.isDebug = (settingsSvs.isDebug.get() == 1);

      var store = new S3Store({
        credential: {
          accessKeyId: auth.id,
          secretAccessKey: auth.secret
        },
        endpoint: s3Client.getS3Endpoint(
          region,
          options.from.bucket,
          auth.servicetpl || auth.eptpl
        ),
        region: region,
        httpOptions: {
          connectTimeout: 3000, // 3s
          timeout: 86400000 // 1d
        }
      });

      return store.createDownloadJob(options);
    }

    /**
     * 下载
     * @param bucketInfos {array}  item={region, bucket, path, name, size=0, isFolder=false}  有可能是目录，需要遍历
     * @param toLocalPath {string}
     * @param jobsAddedFn {Function} 加入列表完成回调方法， jobs列表已经稳定
     */
    function createDownloadJobs(bucketInfos, toLocalPath, jobsAddedFn) {
      stopCreatingFlag = false;

      var authInfo = AuthInfo.get();
      var dirPath = path.dirname(bucketInfos[0].path);

      loop(bucketInfos, (jobs) => {

      }, () => {
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

        var fileName = path.basename(s3info.path);
        var filePath = path.join(
          toLocalPath,
          path.relative(dirPath, s3info.path)
        );

        if (s3info.isFolder) {
          fs.mkdir(filePath, (err) => {
            if (err && err.code != "EEXIST") {
              Toast.error("mkdir [" + filePath + "] failed:" + err.message);
              return;
            }

            //遍历 s3 目录
            function tryLoadFiles(marker) {
              s3Client
                .listFiles(s3info.region, s3info.bucket, s3info.path, marker)
                .then((result) => {
                  var files = result.data;
                  files.forEach((f) => {
                    f.region = s3info.region;
                    f.bucket = s3info.bucket;
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
          });
        } else {
          if (process.platform == "win32") {
            //修复window下，文件名含非法字符需要转义
            if (/[\/\\\:\<\>\?\*\"\|]/.test(fileName)) {
              fileName = encodeURIComponent(fileName);
              filePath = path.join(
                path.dirname(filePath),
                encodeURIComponent(path.basename(filePath))
              );
            }
          }

          var job = createJob(authInfo, {
            region: s3info.region,
            from: {
              bucket: s3info.bucket,
              key: s3info.path
            },
            to: {
              name: fileName,
              path: path.normalize(filePath)
            }
          });

          addEvents(job);

          t.push(job);

          if (callFn) callFn();
          if (callFn2) callFn2();
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

      job.on("partcomplete", (part) => {
        job.downloadedParts[part.PartNumber] = part;

        trySaveProg();

        $timeout(() => {
          $scope.calcTotalProg();
        });
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
      job.on("speedChange", () => {
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
          console.error(`download s3://${job.from.bucket}/${job.from.key} error: ${err.message}`);
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
                job.start(progs[job.id].downloadedParts);
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
          prog: job.prog,
          status: job.status,
          message: job.message,
          downloadedParts: job.downloadedParts
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
      var folder = path.join(os.homedir(), ".s3-browser");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      var username = AuthInfo.get().id || "s3-browser";

      return path.join(folder, "downprog_" + username + ".json");
    }
  }
]);