angular.module("web").controller("transferFrameCtrl", [
  "$scope",
  "$translate",
  "s3UploadMgr",
  "s3DownloadMgr",
  "Toast",
  "Const",
  function (
    $scope,
    $translate,
    s3UploadMgr,
    s3DownloadMgr,
    Toast,
    Const
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      transTab: 1,

      lists: {
        uploadJobList: [],
        downloadJobList: []
      },
      overwriteUploading: {
        enabled: localStorage.getItem(Const.OVERWRITE_UPLOADING) || false,
      },
      overwriteDownloading: {
        enabled: localStorage.getItem(Const.OVERWRITE_DOWNLOADING) || false,
      },

      totalStat: {
        running: 0,
        total: 0,
        upDone: 0,
        upStopped: 0,
        upFailed: 0,
        downDone: 0,
        downStopped: 0,
        downFailed: 0
      },

      calcTotalProg: calcTotalProg
    });

    // functions in parent scope
    $scope.handlers.uploadFilesHandler = uploadFilesHandler;
    $scope.handlers.downloadFilesHandler = downloadFilesHandler;

    s3UploadMgr.init($scope);
    s3DownloadMgr.init($scope);

    /**
     * upload
     * @param filePaths []  {array<string>}, iter for folder
     * @param bucketInfo {object} {bucket, region, key}
     */
    function uploadFilesHandler(filePaths, bucketInfo) {
      Toast.info(T("upload.addtolist.on"));

      s3UploadMgr.createUploadJobs(filePaths, bucketInfo, function (isCancelled) {
        Toast.info(T("upload.addtolist.success"));

        $scope.transTab = 1;
        $scope.toggleTransVisible(true);
      });
    }

    /**
     * download
     * @param fromS3Path {array}  item={region, bucket, path, name, size=0, isFolder=false}, create folder if required
     * @param toLocalPath {string}
     */
    function downloadFilesHandler(fromS3Path, toLocalPath) {
      Toast.info(T("download.addtolist.on"));

      s3DownloadMgr.createDownloadJobs(fromS3Path, toLocalPath, function (isCancelled) {
        Toast.info(T("download.addtolist.success"));

        $scope.transTab = 2;
        $scope.toggleTransVisible(true);
      });
    }

    function calcTotalProg() {
      var c = 0,
        c2 = 0,
        cf = 0,
        cf2 = 0,
        cs = 0,
        cs2 = 0;
      angular.forEach($scope.lists.uploadJobList, function (n) {
        if (n.status == "running") {
          c++;
        }
        if (n.status == "waiting") {
          c++;
        }
        if (n.status == "verifying") {
          c++;
        }
        if (n.status == "failed") {
          cf++;
        }
        if (n.status == "stopped") {
          c++;
          cs++;
        }
      });
      angular.forEach($scope.lists.downloadJobList, function (n) {
        if (n.status == "running") {
          c2++;
        }
        if (n.status == "waiting") {
          c2++;
        }
        if (n.status == "failed") {
          cf2++;
        }
        if (n.status == "stopped") {
          c2++;
          cs2++;
        }
      });

      $scope.totalStat.running = c + c2;
      $scope.totalStat.total = $scope.lists.uploadJobList.length + $scope.lists.downloadJobList.length;
      $scope.totalStat.upDone = $scope.lists.uploadJobList.length - c;
      $scope.totalStat.upStopped = cs;
      $scope.totalStat.upFailed = cf;
      $scope.totalStat.downDone = $scope.lists.downloadJobList.length - c2;
      $scope.totalStat.downStopped = cs2;
      $scope.totalStat.downFailed = cf2;
    }
  }
]);
