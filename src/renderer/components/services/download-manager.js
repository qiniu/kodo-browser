import fs from 'fs'
import path from 'path'

import sanitize from 'sanitize-filename'
import { KODO_MODE } from 'kodo-s3-adapter-sdk'

import { DownloadJob } from '@/models/job'
import webModule from '@/app-module/web'

import NgConfig from '@/ng-config'
import * as AuthInfo from './authinfo'
import NgQiniuClient from './ng-qiniu-client'
import { TOAST_FACTORY_NAME as Toast } from '../directives/toast-list'
import Settings from './settings.ts'

const DOWNLOAD_MGR_FACTORY_NAME = 'DownloadMgr'

webModule.factory(DOWNLOAD_MGR_FACTORY_NAME, [
  "$q",
  "$timeout",
  '$translate',
  NgQiniuClient,
  NgConfig,
  Toast,
  function (
    $q,
    $timeout,
    $translate,
    QiniuClient,
    Config,
    Toast,
  ) {
    const T = $translate.instant
    const pfs = fs.promises

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
     * @param  briefJob { object: { options: {region, from, to,}}}
     * @param  briefJob.from {bucket, key}
     * @param  briefJob.to   {name, path}
     * @return job  { start(), stop(), status, progress }
     */
    function createJob(briefJob) {
      const { options } = briefJob;
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
        ucUrl: config.ucUrl || "",
        regions: config.regions || [],
      };
      options.region = region;
      options.domain = domain;
      options.resumeDownload = (Settings.resumeDownload === 1);
      options.multipartDownloadThreshold = Settings.multipartDownloadThreshold;
      options.multipartDownloadSize = Settings.multipartDownloadSize;
      options.downloadSpeedLimit = Settings.downloadSpeedLimitEnabled === 1
        ? Settings.downloadSpeedLimitKBperSec
        : 0;
      options.isDebug = (Settings.isDebug === 1);

      return new DownloadJob(options);
    }

    /**
     * 下载
     * @param bucketInfos {array}  item={region, bucket, path, name, size=0, itemType='file'}  有可能是目录，需要遍历
     * @param toLocalPath {string}
     * @param jobsAddedFn {Function} 加入列表完成回调方法， jobs列表已经稳定
     */
    function createDownloadJobs(bucketInfos, toLocalPath, jobsAddedFn) {
      stopCreatingFlag = false;

      const dirPath = bucketInfos[0].path.parentDirectoryPath();

      loop(bucketInfos, (jobs) => {}, () => {
        if (jobsAddedFn) {
          jobsAddedFn();
        }
      });

      function loop(arr, callFn, callFn2) {
        const t = [];
        const len = arr.length;
        let c = 0;
        let c2 = 0;

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

            $timeout(_kdig, 0);
          }
        }
      }

      function dig(qiniuInfo, t, callFn, callFn2) {
        if (stopCreatingFlag) {
          return;
        }

        const fileName = sanitize(qiniuInfo.path.basename() || qiniuInfo.path.directoryBasename());
        let filePath = '';
        if (path.sep == '\\') {
          angular.forEach(path.relative(dirPath.toString().replace(/\\/g, '/'), qiniuInfo.path.toString()).replace(/\\/g, '/').split('/'), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        } else {
          angular.forEach(path.relative(dirPath.toString(), qiniuInfo.path.toString()).split('/'), (folder) => {
            filePath = path.join(filePath, sanitize(folder));
          });
        }

        if (qiniuInfo.itemType === 'folder') {
          // list all files under qiniuInfo.path
          function tryLoadFiles(marker) {
            QiniuClient
              .listFiles(qiniuInfo.region, qiniuInfo.bucket, qiniuInfo.path.toString(), marker, {
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

          if (!qiniuInfo.path.directoryBasename()) {
            Toast.error(T('download.emptyNameFolder.forbidden', { path: qiniuInfo.path.toString() }));
            return;
          }

          tryLoadFiles();
        } else {
          let fileFolders = '';
          if (path.sep == '\\') {
            fileFolders = path.dirname(filePath.replace(/\\/g, '/')).split('/');
          } else {
            fileFolders = path.dirname(filePath.replace(path.sep, '/')).split('/');
          }

          fileFolders.reduce((prevPromise, folder) => {
            return prevPromise.then((localFolder) => {
              const absfolder = localFolder.joinFolder(folder);

              return pfs.stat(absfolder.toString()).then((stat) => {
                if (stat.isDirectory()) {
                  return Promise.resolve(absfolder);
                }

                return pfs.mkdir(absfolder.toString()).then(() => {
                  return Promise.resolve(absfolder);
                }).catch((err) => {
                  if (err.message.indexOf('EEXIST: file already exists') > -1) {
                    return Promise.resolve(absfolder);
                  }

                  throw err;
                });
              }).catch((err) => {
                return pfs.mkdir(absfolder.toString()).then(() => {
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
            const fileLocalPathWithoutExt = path.normalize(localPath.joinFile(path.basename(fileName, ext)).toString());
            let fileLocalPathWithSuffixWithoutExt = fileLocalPathWithoutExt

            if (!$scope.overwriteDownloading.enabled) {
              for (let i = 1; fs.existsSync(fileLocalPathWithSuffixWithoutExt + ext); i++) {
                fileLocalPathWithSuffixWithoutExt = `${fileLocalPathWithoutExt}.${i}`;
              }
            }

            const job = createJob({
              options: {
                region: qiniuInfo.region,
                from: {
                  bucket: qiniuInfo.bucket,
                  key: qiniuInfo.path.toString(),
                  size: qiniuInfo.size,
                  mtime: qiniuInfo.lastModified.getTime(),
                },
                to: {
                  name: fileName,
                  path: fileLocalPathWithSuffixWithoutExt + ext
                },
                domain: qiniuInfo.domain.toQiniuDomain(),
                backendMode: qiniuInfo.domain.qiniuBackendMode(),
              },
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
          console.error(`download kodo://${job.options.from.bucket}/${job.options.from.key} error: ${err}`);
        }

        concurrency--;
        trySchedJob();

        $timeout(() => {
          $scope.calcTotalProg();
        });
      });
    }

    function trySchedJob() {
      var maxConcurrency = Settings.maxDownloadConcurrency;
      var isDebug = (Settings.isDebug === 1);

      concurrency = Math.max(0, concurrency);
      if (isDebug) {
        console.log(`[JOB] download max: ${maxConcurrency}, cur: ${concurrency}, jobs: ${$scope.lists.downloadJobList.length}`);
      }

      if (concurrency < maxConcurrency) {
        const jobs = $scope.lists.downloadJobList;

        const startAllJobsFrom = (i) => {
          if (i >= jobs.length) {
            return;
          }
          if (concurrency >= maxConcurrency) {
            return;
          }

          const job = jobs[i];
          if (isDebug) {
            console.log('[JOB] sched ', job.status, ' => ', job.options);
          }
          if (job.status === "waiting") {
            concurrency++;

            if (job.prog.resumable) {
              tryLoadProgForJob(job).then((job) => {
                job.start(job && job.prog);
              }).finally(() => {
                startAllJobsFrom(i + 1);
              });
              return;
            } else {
              job.start();
            }
          }
          $timeout(() => { startAllJobsFrom(i + 1); });
        };
        startAllJobsFrom(0);
      }
    }

    function trySaveProg() {
      var t = {};
      angular.forEach($scope.lists.downloadJobList, function (job) {
        if (job.status === "finished") return;

        t[job.id] = job.getInfoForSave();
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

      if (!progs) {
        return Promise.resolve([]);
      }

      const promises = Object.values(progs)
          .map(briefJob => ({
            options: briefJob,
          }))
          .map(jobOptions => tryLoadProgForJob(jobOptions));
      return Promise.all(promises);
    }

    function tryLoadProgForJob(job) {
      return new Promise((resolve) => {
        // next block within `if` handle persist job < v1.0.16
        if (job.prog && job.prog.synced) {
          job.prog.loaded = job.prog.synced;
          delete job.prog.synced;

          job.from.mtime = new Date(job.from.mtime).getTime();
        }
        const options = { ignoreError: true };
        if (job.options.backendMode === KODO_MODE) {
          options.preferKodoAdapter = true;
        } else {
          options.preferS3Adapter = true;
        }
        QiniuClient.headFile(job.options.region, job.options.from.bucket, job.options.from.key, options).then((info) => {
          if (info.size !== job.options.from.size || info.lastModified.getTime() !== job.options.from.mtime) {
            if (job.prog) {
              job.prog.loaded = 0;
            }
          }
          resolve(job);
        }).catch(() => {
          if (job.prog) {
            job.prog.loaded = 0;
          }
          resolve(job);
        });
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

export default DOWNLOAD_MGR_FACTORY_NAME
