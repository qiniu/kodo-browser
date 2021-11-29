import fs from 'fs'
import path from 'path'

import qiniuPath from "qiniu-path"

import QiniuStore from '../../../common/qiniu-store/lib'
import webModule from '@/app-module/web'

import QiniuClient from './qiniu-client'
import AuthInfo from './authinfo'
import Config from '@/config'
import settingsSvs from './settings'

const UPLOAD_MGR_FACTORY_NAME = 'UploadMgr'

webModule.factory(UPLOAD_MGR_FACTORY_NAME, [
  "$q",
  "$timeout",
  "$translate",
  QiniuClient,
  AuthInfo,
  Config,
  settingsSvs,
  function (
    $q,
    $timeout,
    $translate,
    QiniuClient,
    AuthInfo,
    Config,
    settingsSvs
  ) {
    const T = $translate.instant;

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

      angular.forEach(tryLoadProg(), (prog) => {
        const job = createJob(prog);
        if (job.status === "waiting" || job.status === "running") {
          job.stop();
        }
        addEvents(job);
      });
    }

    /**
      * @param  options   { region, from, to, progress, checkPoints, ...}
      * @param  options.from {name, path}
      * @param  options.to   {bucket, key}
      * @return job  { start(), stop(), status, progress }
                job.events: statuschange, progress
      */
    function createJob(options) {
      const bucket = options.to.bucket,
            region = options.region;

      console.info(
        "PUT",
        "::",
        region,
        "::",
        options.from.path + "/" + options.from.name,
        "=>",
        options.to.bucket + "/" + options.to.key
      );

      const config = Config.load();

      options.clientOptions = {
        accessKey: AuthInfo.get().id,
        secretKey: AuthInfo.get().secret,
        ucUrl: config.ucUrl,
        regions: config.regions || [],
      };
      options.region = region;
      options.resumeUpload = (settingsSvs.resumeUpload.get() == 1);
      options.multipartUploadSize = settingsSvs.multipartUploadSize.get();
      options.multipartUploadThreshold = settingsSvs.multipartUploadThreshold.get();
      options.uploadSpeedLimit = (settingsSvs.uploadSpeedLimitEnabled.get() == 1 && settingsSvs.uploadSpeedLimitKBperSec.get());
      options.isDebug = (settingsSvs.isDebug.get() == 1);

      const store = new QiniuStore();
      return store.createUploadJob(options);
    }

    /**
     * upload
     * @param filePaths []  {array<string>}  有可能是目录，需要遍历
     * @param bucketInfo {object} {bucket, region, key}
     * @param uploadOptions {object} {isOverwrite, storageClassName}, storageClassName is 'Standard', 'InfrequentAccess', 'Glacier'
     * @param jobsAddingFn {Function} 快速加入列表回调方法， 返回jobs引用，但是该列表长度还在增长。
     * @param jobsAddedFn {Function} 加入列表完成回调方法， jobs列表已经稳定
     */
    function createUploadJobs(filePaths, bucketInfo, uploadOptions, jobsAddingFn) {
      stopCreatingFlag = false;

      _kdig(filePaths, () => {
        if (jobsAddingFn) {
          jobsAddingFn();
        }
      });
      return;

      function _kdig(filePaths, fn) {
        let t = [];
        let c = 0;
        const len = filePaths.length;

        function _dig() {
          if (stopCreatingFlag) {
            return;
          }

          const n = filePaths[c];
          const dirPath = n.parentDirectoryPath();

          dig(filePaths[c].toString(), dirPath, (jobs) => {
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
          dig(path.join(parentPath.toString(), arr[c].toString()), dirPath, (jobs) => {
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

        const fileName = path.basename(absPath);
        let filePath = path.relative(dirPath.toString(), absPath);

        if (bucketInfo.key) {
          if (bucketInfo.key.endsWith('/')) {
            filePath = bucketInfo.key + filePath;
          } else {
            filePath = bucketInfo.key + '/' + filePath;
          }
        }
        const fileStat = fs.statSync(absPath);

        if (fileStat.isDirectory()) {
          //创建目录
          let subDirPath = filePath + '/';
          if (path.sep == '\\') {
            subDirPath = subDirPath.replace(/\\/g, '/');
          }
          subDirPath = qiniuPath.fromQiniuPath(subDirPath);

          //递归遍历目录
          fs.readdir(absPath, (err, arr) => {
            if (err) {
              console.error(err.stack);
            } else if (arr.length > 0 || arr.length === 0 && $scope.emptyFolderUploading.enabled) {
              QiniuClient
                .createFolder(bucketInfo.regionId, bucketInfo.bucketName, subDirPath)
                .then(() => {
                  checkNeedRefreshFileList(bucketInfo.bucketName, subDirPath);
                  loop(absPath, dirPath, arr, (jobs) => { $timeout(() => { callFn(jobs); }, 1); });
                });
            } else {
              $timeout(() => { callFn([]); }, 1);
            }
          });
        } else {
          //文件

          //修复 window 下 \ 问题
          if (path.sep == '\\') {
            filePath = filePath.replace(/\\/g, '/');
          }

          const job = createJob({
            region: bucketInfo.regionId,
            from: {
              name: fileName,
              path: absPath
            },
            to: {
              bucket: bucketInfo.bucketName,
              key: filePath
            },
            overwrite: uploadOptions.isOverwrite,
            storageClassName: uploadOptions.storageClassName,
            backendMode: bucketInfo.qiniuBackendMode,
          });
          addEvents(job);
          $timeout(() => { callFn([job]); }, 1);
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
        concurrency--;
        $timeout(() => {
          trySchedJob();
          $scope.calcTotalProg();
        });
      });
      job.on("partcomplete", (data) => {
        job.uploadedId = data.uploadId;
        job.uploadedParts[data.part.partNumber] = data.part;

        trySaveProg();

        $timeout($scope.calcTotalProg);
      });
      job.on("statuschange", (status) => {
        if (status == "stopped") {
          concurrency--;
          $timeout(trySchedJob);
        }

        trySaveProg();
        $timeout($scope.calcTotalProg);
      });
      job.on("speedchange", () => {
        $timeout($scope.calcTotalProg);
      });
      job.on("complete", () => {
        concurrency--;

        $timeout(() => {
          trySchedJob();
          $scope.calcTotalProg();
          checkNeedRefreshFileList(job.to.bucket, qiniuPath.fromLocalPath(job.to.key));
        });
      });
      job.on("error", (err) => {
        if (err) {
          console.error(`upload kodo://${job.to.bucket}/${job.to.key} error: ${err}`);
        }
        if (job.message) {
          switch (job.message.error) {
          case 'Forbidden':
            job.message.i18n = T('permission.denied');
          }
        }

        concurrency--;
        $timeout(() => {
          trySchedJob();
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

        for (var i = 0; i < jobs.length && concurrency < maxConcurrency; i++) {
          var job = jobs[i];
          if (isDebug) {
            console.log(`[JOB] sched ${job.status} => ${JSON.stringify(job._config)}`);
          }

          if (job.status === 'waiting') {
            concurrency++;

            if (job.prog.resumable) {
              var progs = tryLoadProg();

              if (progs && progs[job.id]) {
                job.start(true, progs[job.id]);
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
        if (job.status === 'finished') return;

        if (!job.uploadedParts) {
          job.uploadedParts = [];
        }

        if (fs.existsSync(job.from.path)) {
          const fileStat = fs.statSync(job.from.path);

          job.from.size = fileStat.size;
          job.from.mtime = fileStat.mtimeMs;

          t[job.id] = {
            region: job.region,
            to: job.to,
            from: job.from,
            prog: job.prog,
            status: job.status,
            message: job.message,
            uploadedId: job.uploadedId,
            uploadedParts: job.uploadedParts.map((part) => {
              return { PartNumber: part.partNumber, ETag: part.etag };
            }),
            overwrite: job.overwrite,
            storageClassName: job.storageClassName,
            backendMode: job.backendMode,
          };
        }
      });

      fs.writeFileSync(getProgFilePath(), JSON.stringify(t));
    }

    function tryLoadProg() {
      let progs = {};
      try {
        const data = fs.readFileSync(getProgFilePath());
        progs = JSON.parse(data);
      } catch (e) {}

      Object.entries(progs).forEach(([jobId, job]) => {
        if (!job.uploadedParts) {
          job.uploadedParts = [];
        }
        job.uploadedParts = job.uploadedParts.
          filter(part => part && part.PartNumber && part.ETag).
          map((part) => {
          return { partNumber: part.PartNumber, etag: part.ETag };
        });
        if (job.from && job.from.size && job.from.mtime) {
          if (fs.existsSync(job.from.path)) {
            const fileStat = fs.statSync(job.from.path);
            if (fileStat.size === job.from.size && job.from.mtime === fileStat.mtimeMs) {
              return;
            }
          }
        }
        job.uploadedParts = [];
        if (job.prog) {
          delete job.prog.loaded;
        }
      });

      return progs;
    }

    function getProgFilePath() {
      var folder = Global.config_path;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      const username = AuthInfo.get().id || "kodo-browser";
      return path.join(folder, "upprog_" + username + ".json");
    }

    function checkNeedRefreshFileList(bucket, key) {
      if ($scope.currentInfo.bucketName === bucket) {
        if ($scope.currentInfo.key === key.parentDirectoryPath().toString()) {
          $scope.$emit('refreshFilesList');
        }
      }
    }
  }
]);

export default UPLOAD_MGR_FACTORY_NAME