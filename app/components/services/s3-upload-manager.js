angular.module("web").factory("s3UploadMgr", [
  "$state",
  "$timeout",
  "s3Client",
  "AuthInfo",
  "Toast",
  "Const",
  "DelayDone",
  "safeApply",
  "settingsSvs",
  function (
    $state,
    $timeout,
    s3Client,
    AuthInfo,
    Toast,
    Const,
    DelayDone,
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
      createUploadJobs: createUploadJobs,
      trySchedJob: trySchedJob,
      trySaveProg: trySaveProg,

      stopCreatingJobs: function () {
        stopCreatingFlag = true;
      }
    };

    function init(scope) {
      $scope = scope;
      $scope.lists.uploadJobList = [];

      var auth = AuthInfo.get();
      var progs = tryLoadProg();

      angular.forEach(progs, function (prog) {
        var job = createJob(auth, prog);
        if (job.status == "waiting" || job.status == "running") {
          job.stop();
        }

        addEvents(job);
      });
    }

    /**
      * @param  auth { id, secret}
      * @param  options   { region, from, to, progress, checkPoints, ...}
      * @param  options.from {name, path}
      * @param  options.to   {bucket, key}
      * @return job  { start(), stop(), status, progress }
                job.events: statuschange, progress
      */
    function createJob(auth, options) {
      var region = options.region || auth.region || "cn-east-1";

      // if (options.to.key.indexOf(' ') >= 0) {
      //   Toast.error('文件名不能包含空格');
      //   return;
      // }

      options.region = region;
      options.resumeUpload = (settingsSvs.resumeUpload.get() == 1);
      options.multipartUploadSize = settingsSvs.multipartUploadSize.get();
      options.multipartUploadThreshold = settingsSvs.multipartUploadThreshold.get();
      options.useElectronNode = (settingsSvs.useElectronNode.get() == 1);
      options.isDebug = (settingsSvs.isDebug.get() == 1);

      var store = new S3Store({
        credential: {
          accessKeyId: auth.id,
          secretAccessKey: auth.secret
        },
        endpoint: s3Client.getS3Endpoint(region, options.to.bucket, auth.servicetpl || auth.eptpl),
        region: options.region,
        httpOptions: {
          connectTimeout: 3000, // 3s
          timeout: 86400000 // 1d
        }
      });

      return store.createUploadJob(options);
    }

    /**
     * upload
     * @param filePaths []  {array<string>}  有可能是目录，需要遍历
     * @param bucketInfo {object} {bucket, region, key}
     * @param jobsAddingFn {Function} 快速加入列表回调方法， 返回jobs引用，但是该列表长度还在增长。
     * @param jobsAddedFn {Function} 加入列表完成回调方法， jobs列表已经稳定
     */
    function createUploadJobs(filePaths, bucketInfo, jobsAddingFn) {
      stopCreatingFlag = false;

      var authInfo = AuthInfo.get();

      _kdig(filePaths, () => {
        if (jobsAddingFn) {
          jobsAddingFn();
        }
      });
      return;

      function _kdig(filePaths, fn) {
        var t = [];
        var len = filePaths.length;
        var c = 0;

        function _dig() {
          if (stopCreatingFlag) {
            return;
          }

          var n = filePaths[c];
          var dirPath = path.dirname(n);

          dig(filePaths[c], dirPath, (jobs) => {
            t = t.concat(jobs);
            c++;

            if (c >= len) {
              fn(t);
            } else {
              _dig();
            }
          });
        }
        _dig();
      }

      function loop(parentPath, dirPath, arr, callFn) {
        var t = [];
        var len = arr.length;
        var c = 0;
        if (len == 0) {
          callFn([]);
        } else {
          inDig();
        }

        //串行
        function inDig() {
          dig(path.join(parentPath, arr[c]), dirPath, (jobs) => {
            t = t.concat(jobs);

            c++;
            if (c >= len) {
              callFn(t);
            } else {
              if (stopCreatingFlag) {
                return;
              }

              inDig();
            }
          });
        }
      }

      function dig(absPath, dirPath, callFn) {
        if (stopCreatingFlag) {
          return;
        }

        var fileName = path.basename(absPath);
        var filePath = path.relative(dirPath, absPath);

        filePath = bucketInfo.key ? bucketInfo.key + "/" + filePath : filePath;

        if (fs.statSync(absPath).isDirectory()) {
          //创建目录
          var subDirPath = filePath + "/";
          subDirPath = path.normalize(subDirPath);
          if (path.sep != "/") {
            subDirPath = subDirPath.replace(/\\/g, "/");
          }

          s3Client
            .createFolder(bucketInfo.region, bucketInfo.bucket, subDirPath)
            .then(() => {
              checkNeedRefreshFileList(bucketInfo.bucket, subDirPath);
            });

          //递归遍历目录
          fs.readdir(absPath, (err, arr) => {
            if (err) {
              console.error(err.stack);
            } else {
              loop(absPath, dirPath, arr, (jobs) => {
                $timeout(() => {
                  callFn(jobs);
                }, 1);
              });
            }
          });
        } else {
          //文件

          //修复window下 \ 问题
          filePath = path.normalize(filePath);
          if (path.sep != "/") {
            filePath = filePath.replace(/\\/g, "/");
          }

          var job = createJob(authInfo, {
            region: bucketInfo.region,
            from: {
              name: fileName,
              path: absPath
            },
            to: {
              bucket: bucketInfo.bucket,
              key: filePath
            }
          });

          if (job) {
            addEvents(job);

            $timeout(() => {
              callFn([job]);
            }, 1);
          }
        }
      }
    }

    function addEvents(job) {
      if (!job.uploadedParts) {
        job.uploadedParts = [];
      }

      $scope.lists.uploadJobList.push(job);

      trySchedJob();
      trySaveProg();

      $timeout(() => {
        $scope.calcTotalProg();
      });

      job.on('fileDuplicated', (data) => {
        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
      job.on("partcomplete", (part) => {
        job.uploadedParts[part.PartNumber] = part;

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

          checkNeedRefreshFileList(job.to.bucket, job.to.key);
        });
      });
      job.on("error", (err) => {
        if (err) {
          console.error(`upload s3://${job.to.bucket}/${job.to.key} error: ${err.message}`);
        }

        concurrency--;
        trySchedJob();

        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
    }

    function trySchedJob() {
      var maxConcurrency = settingsSvs.maxUploadConcurrency.get();
      var isDebug = (settingsSvs.isDebug.get() == 1);

      concurrency = Math.max(0, concurrency);
      if (isDebug) {
        console.log(`[JOB] upload max: ${maxConcurrency}, cur: ${concurrency}, jobs: ${$scope.lists.uploadJobList.length}`);
      }

      if (concurrency < maxConcurrency) {
        var jobs = $scope.lists.uploadJobList;

        for (var i = 0; i < jobs.length; i++) {
          if (concurrency >= maxConcurrency) return;

          var job = jobs[i];
          if (isDebug) {
            console.log(`[JOB] sched ${job.status} => ${JSON.stringify(job._config)}`);
          }

          if (job.status == "waiting") {
            concurrency++;

            if (job.prog.resume) {
              var progs = tryLoadProg();

              if (progs && progs[job.id]) {
                job.start(true, progs[job.id].uploadedParts);
              } else {
                job.start(true);
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
      angular.forEach($scope.lists.uploadJobList, (job) => {
        if (job.status == "finished") return;

        t[job.id] = {
          region: job.region,
          to: job.to,
          from: job.from,
          prog: job.prog,
          status: job.status,
          message: job.message,
          uploadedParts: job.uploadedParts
        };
      });

      fs.writeFileSync(getProgFilePath(), JSON.stringify(t));
    }

    function tryLoadProg() {
      try {
        var data = fs.readFileSync(getProgFilePath());

        return JSON.parse(data ? data.toString() : "[]");
      } catch (e) {}

      return [];
    }

    function getProgFilePath() {
      var folder = path.join(os.homedir(), ".s3-browser");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      var username = AuthInfo.get().id || "s3-browser";

      return path.join(folder, "upprog_" + username + ".json");
    }

    function checkNeedRefreshFileList(bucket, key) {
      if ($scope.currentInfo.bucket == bucket) {
        var p = path.dirname(key) + "/";
        p = p == "./" ? "" : p;

        if ($scope.currentInfo.key == p) {
          $scope.$emit("refreshFilesList");
        }
      }
    }
  }
]);