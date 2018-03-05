"use strict";

angular.module("web").controller("settingsCtrl", [
  "$scope",
  "$state",
  "$timeout",
  "$uibModalInstance",
  "$translate",
  "callback",
  "settingsSvs",
  "Mailer",
  "Toast",
  "Dialog",
  "Const",
  function (
    $scope,
    $state,
    $timeout,
    $modalInstance,
    $translate,
    callback,
    settingsSvs,
    Mailer,
    Toast,
    Dialog,
    Const
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      set: {
        autoUpgrade: settingsSvs.autoUpgrade.get(),
        resumeUpload: settingsSvs.resumeUpload.get(),
        resumeUploadThreshold: settingsSvs.resumeUploadThreshold.get(),
        resumeUploadSize: settingsSvs.resumeUploadSize.get(),
        resumeDownload: settingsSvs.resumeDownload.get(),
        resumeDownloadThreshold: settingsSvs.resumeDownloadThreshold.get(),
        resumeDownloadSize: settingsSvs.resumeDownloadSize.get(),
        maxUploadJobCount: settingsSvs.maxUploadJobCount.get(),
        maxDownloadJobCount: settingsSvs.maxDownloadJobCount.get(),
        showImageSnapshot: settingsSvs.showImageSnapshot.get(),
        historiesLength: settingsSvs.historiesLength.get(),
        mailSmtp: settingsSvs.mailSmtp.get()
      },
      reg: {
        email: Const.REG.EMAIL
      },
      setChange: setChange,
      cancel: cancel,

      testMail: testMail
    });

    var tid;

    function setChange(form1, key, ttl) {
      $timeout.cancel(tid);
      tid = $timeout(function () {
        //if (!form1.$valid) return;

        settingsSvs[key].set($scope.set[key]);
        Toast.success(T("settings.success")); //已经保存设置
      }, ttl || 100);
    }

    function cancel() {
      if (callback) callback();
      $modalInstance.dismiss("close");
    }

    function testMail() {
      var title = T("mail.test.title"); //测试邮件
      var message = T("mail.test.message", {
        from: $scope.set.mailSmtp.from
      }); //将发送测试邮件到

      Dialog.confirm(title, message, function (b) {
        if (!b) return;
        Toast.info(T("mail.send.on"));
        Mailer.send({
          subject: "S3 Browser Testing",
          to: $scope.set.mailSmtp.from,
          html: "<h3>Testing mail content</h3>"
        }).then(
          function (result) {
            Toast.success(T("mail.test.success")); // 邮件发送成功');
          },
          function (err) {
            Toast.error(err);
          }
        );
      });
    }
  }
]);