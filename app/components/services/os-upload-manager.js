angular.module("web").factory("osUploadManager", [
  "$q",
  "$state",
  "$timeout",
  "osClient",
  "AuthInfo",
  "Toast",
  "Const",
  "DelayDone",
  "safeApply",
  "settingsSvs",
  function (
    $q,
    $state,
    $timeout,
    osClient,
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
      S3Store = require("./node/s3store"),
      Pend = require('pend');

    var $scope;
    var concurrency = 0;
    var resumeUpload = 0;
    var resumeUploadThreshold = 100; // unit in M
    var stopCreatingFlag = false;

    return {
      init: init,
      createUploadJobs: createUploadJobs,
      checkStart: checkStart,
      saveProg: saveProg,

      stopCreatingJobs: function () {
        stopCreatingFlag = true;
      }
    };

    function init(scope) {
      $scope = scope;
      $scope.lists.uploadJobList = [];

      resumeUpload = settingsSvs.resumeUpload.get();
      resumeUploadThreshold = settingsSvs.resumeUploadThreshold.get();

      var authInfo = AuthInfo.get();
      var progs = tryLoadProg();

      angular.forEach(progs, function (prog) {
        var job = createJob(authInfo, prog);
        if (job.status == "waiting" || job.status == "running") {
          job.stop();
        }

        addEvents(job);
      });
    }

    /**
      * 创建单个job
      * @param  auth { id, secret}
      * @param  opt   { region, from, to, progress, checkPoints, ...}
      * @param  opt.from {name, path}
      * @param  opt.to   {bucket, key}
      * @return job  { start(), stop(), status, progress }
                job.events: statuschange, progress
      */
    function createJob(auth, opt) {
      var region = opt.region || auth.region || "cn-east-1";

      opt.region = region;
      opt.resumeUpload = resumeUpload == 1;
      opt.mulipartUploadThreshold = resumeUploadThreshold;

      var store = new S3Store({
        credential: {
          accessKeyId: auth.id,
          secretAccessKey: auth.secret
        },
        endpoint: osClient.getS3Endpoint(region, opt.to.bucket, auth.s3apitpl || auth.eptpl),
        region: region,
        httpOptions: {
          connectTimeout: 3000, // 3s
          timeout: 3600000 // 1h
        }
      });

      return store.createUploadJob(opt);
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

      digArr(filePaths, function () {
        if (jobsAddingFn) {
          jobsAddingFn();
        }
      });
      return;

      function digArr(filePaths, fn) {
        var t = [];
        var len = filePaths.length;
        var c = 0;

        function _dig() {
          if (stopCreatingFlag) {
            return;
          }

          var n = filePaths[c];
          var dirPath = path.dirname(n);

          dig(filePaths[c], dirPath, function (jobs) {
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
          dig(path.join(parentPath, arr[c]), dirPath, function (jobs) {
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

        //修复window下 \ 问题
        if (path.sep != "/") {
          filePath = filePath.replace(/\\/g, "/");
        }

        if (fs.statSync(absPath).isDirectory()) {
          //创建目录
          osClient
            .createFolder(bucketInfo.region, bucketInfo.bucket, filePath + "/")
            .then(function () {
              //判断是否刷新文件列表
              checkNeedRefreshFileList(bucketInfo.bucket, filePath + "/");
            });

          //递归遍历目录
          fs.readdir(absPath, function (err, arr) {
            if (err) {
              console.log(err.stack);
            } else {
              loop(absPath, dirPath, arr, function (jobs) {
                $timeout(function () {
                  callFn(jobs);
                }, 1);
              });
            }
          });
        } else {
          //文件
          var job = createJob(authInfo, {
            region: bucketInfo.region,
            from: {
              name: fileName,
              path: absPath
            },
            to: {
              bucket: bucketInfo.bucket,
              key: path.normalize(filePath)
            }
          });

          addEvents(job);

          $timeout(function () {
            callFn([job]);
          }, 1);
        }
      }
    }

    function addEvents(job) {
      $scope.lists.uploadJobList.push(job);
      safeApply($scope);
      checkStart();

      //save
      saveProg();

      job.on("partcomplete", function (prog) {
        safeApply($scope);
        saveProg();
      });
      job.on("statuschange", function (status) {
        if (status == "stopped") {
          concurrency--;
          $timeout(checkStart, 100);
        }

        safeApply($scope);
        saveProg();
      });
      job.on("speedChange", function () {
        safeApply($scope);
      });
      job.on("complete", function () {
        concurrency--;
        checkStart();
        checkNeedRefreshFileList(job.to.bucket, job.to.key);
      });
      job.on("error", function (err) {
        console.error(err);

        concurrency--;
        checkStart();
      });
    }

    function checkStart() {
      var maxConcurrency = settingsSvs.maxUploadJobCount.get();

      concurrency = Math.max(0, concurrency);
      if (concurrency < maxConcurrency) {
        var jobs = $scope.lists.uploadJobList;
        for (var i = 0; i < jobs.length; i++) {
          if (concurrency >= maxConcurrency) {
            return;
          }

          var n = jobs[i];
          if (n.status == "waiting") {
            n.start();
            concurrency++;
          }
        }
      }
    }

    function checkNeedRefreshFileList(bucket, key) {
      if ($scope.currentInfo.bucket == bucket) {
        var p = path.dirname(key) + "/";
        p = p == "./" ? "" : p;

        if ($scope.currentInfo.key == p) {
          $scope.$emit("needrefreshfilelists");
        }
      }
    }

    /**
     * 保存进度
     */
    function saveProg() {
      DelayDone.delayRun(
        "save_upload_prog",
        1000,
        function () {
          var t = [];
          angular.forEach($scope.lists.uploadJobList, function (n) {
            if (n.status == "finished") return;

            if (n.checkPoints && n.checkPoints.chunks) {
              var checkPoints = angular.copy(n.checkPoints);
              delete checkPoints.chunks;
            }

            t.push({
              crc64Str: n.crc64Str,
              checkPoints: checkPoints,
              region: n.region,
              to: n.to,
              from: n.from,
              status: n.status,
              message: n.message,
              prog: n.prog
            });
          });

          fs.writeFileSync(getUpProgFilePath(), JSON.stringify(t));
          $scope.calcTotalProg();
        },
        20
      );
    }

    /**
     * 获取保存的进度
     */
    function tryLoadProg() {
      try {
        var data = fs.readFileSync(getUpProgFilePath());

        return JSON.parse(data ? data.toString() : "[]");
      } catch (e) {}

      return [];
    }

    function getUpProgFilePath() {
      var folder = path.join(os.homedir(), ".s3-browser");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      var username = AuthInfo.get().id || "";
      return path.join(folder, "upprog_" + username + ".json");
    }
  }
]);