angular.module("web").factory("osDownloadManager", [
  "$q",
  "$state",
  "$timeout",
  "AuthInfo",
  "osClient",
  "Toast",
  "Const",
  "DelayDone",
  "safeApply",
  "settingsSvs",
  function (
    $q,
    $state,
    $timeout,
    AuthInfo,
    osClient,
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
      createDownloadJobs: createDownloadJobs,
      trySchedJob: trySchedJob,
      trySaveProg: trySaveProg,

      stopCreatingJobs: function () {
        stopCreatingFlag = true;
      }
    };

    function init(scope) {
      $scope = scope;
      $scope.lists.downloadJobList = [];

      var authInfo = AuthInfo.get();
      var progs = tryLoadProg();

      angular.forEach(progs, function (n) {
        var job = createJob(authInfo, n);
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
    function createJob(auth, opt) {
      var region = opt.region || auth.region || "cn-east-1";

      opt.region = region;
      opt.resumeDownload = (settingsSvs.resumeDownload.get() == 1);
      opt.mulipartDownloadThreshold = settingsSvs.resumeDownloadThreshold.get();
      opt.mulipartDownloadSize = settingsSvs.resumeDownloadSize.get();

      var store = new S3Store({
        credential: {
          accessKeyId: auth.id,
          secretAccessKey: auth.secret
        },
        endpoint: osClient.getS3Endpoint(
          region,
          opt.from.bucket,
          auth.s3apitpl || auth.eptpl
        ),
        region: region,
        httpOptions: {
          connectTimeout: 3000, // 3s
          timeout: 3600000 // 1h
        }
      });

      return store.createDownloadJob(opt);
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

      loop(
        bucketInfos,
        function (jobs) {},
        function () {
          if (jobsAddedFn) {
            jobsAddedFn();
          }
        }
      );

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
          dig(
            arr[c],
            t,
            function () {},
            function () {
              c2++;
              if (c2 >= len) {
                callFn2(t);
              }
            }
          );
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

      function dig(s3Info, t, callFn, callFn2) {
        if (stopCreatingFlag) {
          return;
        }

        var fileName = path.basename(s3Info.path);
        var filePath = path.join(
          toLocalPath,
          path.relative(dirPath, s3Info.path)
        );

        if (s3Info.isFolder) {
          //目录
          fs.mkdir(filePath, function (err) {
            if (err && err.code != "EEXIST") {
              Toast.error("mkdir [" + filePath + "] failed:" + err.message);
              return;
            }

            //遍历 s3 目录
            function progDig(marker) {
              osClient
                .listFiles(s3Info.region, s3Info.bucket, s3Info.path, marker)
                .then(function (result) {
                  var arr2 = result.data;
                  arr2.forEach(function (n) {
                    n.region = s3Info.region;
                    n.bucket = s3Info.bucket;
                  });
                  loop(
                    arr2,
                    function (jobs) {
                      t = t.concat(jobs);
                      if (result.marker) {
                        $timeout(function () {
                          progDig(result.marker);
                        }, 10);
                      } else {
                        if (callFn) callFn();
                      }
                    },
                    callFn2
                  );
                });
            }
            progDig();
          });
        } else {
          //文件
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
            region: s3Info.region,
            from: {
              bucket: s3Info.bucket,
              key: s3Info.path
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
      $scope.lists.downloadJobList.push(job);
      $scope.calcTotalProg();
      safeApply($scope);
      trySchedJob();

      //save
      trySaveProg();

      job.on("partcomplete", function (prog) {
        safeApply($scope);
        trySaveProg($scope);
      });
      job.on("statuschange", function (status) {
        if (status == "stopped") {
          concurrency--;
          trySchedJob();
        }

        safeApply($scope);
        trySaveProg();
      });
      job.on("speedChange", function () {
        safeApply($scope);
      });
      job.on("complete", function () {
        concurrency--;
        trySchedJob();
      });
      job.on("error", function (err) {
        console.error(err);
        concurrency--;
        trySchedJob();
      });
    }

    //流控, 同时只能有 n 个下载任务.
    function trySchedJob() {
      var maxConcurrency = settingsSvs.maxDownloadJobCount.get();

      concurrency = Math.max(0, concurrency);
      if (concurrency < maxConcurrency) {
        var arr = $scope.lists.downloadJobList;
        for (var i = 0; i < arr.length; i++) {
          if (concurrency >= maxConcurrency) return;

          var n = arr[i];
          if (n.status == "waiting") {
            n.start();
            concurrency++;
          }
        }
      }
    }

    function trySaveProg() {
      DelayDone.delayRun(
        "save_download_prog",
        1000,
        function () {
          var t = [];
          angular.forEach($scope.lists.downloadJobList, function (n) {
            if (n.status == "finished") return;

            t.push({
              checkPoints: n.checkPoints,
              region: n.region,
              to: n.to,
              from: n.from,
              message: n.message,
              status: n.status,
              prog: n.prog
            });
          });
          //console.log('save:', t);

          fs.writeFileSync(getDownProgFilePath(), JSON.stringify(t));
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
        var data = fs.readFileSync(getDownProgFilePath());
        return JSON.parse(data ? data.toString() : "[]");
      } catch (e) {}
      return [];
    }

    //下载进度保存路径
    function getDownProgFilePath() {
      var folder = path.join(os.homedir(), ".s3-browser");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }
      var username = AuthInfo.get().id || "";
      return path.join(folder, "downprog_" + username + ".json");
    }
  }
]);
