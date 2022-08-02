import webModule from '@/app-module/web'

import { toastListHtmlMapping } from "@template-mappings/components/directives"

/*
usage:

step 1. add element to body:
  <toast-list></toast-list>

step 2: use Toast factory
  Toast.info('test');
*/

export const TOAST_DIRECTIVE_NAME = 'toastList'
export const TOAST_FACTORY_NAME = 'Toast'

webModule
  .directive(TOAST_DIRECTIVE_NAME, function () {
    return {
      restrict: "EA",
      templateUrl: toastListHtmlMapping.path,
      controller: [
        "$scope",
        "$timeout",
        function ($scope, $timeout) {
          $scope.alerts = [];

          $scope.$on("message", function (evt, data) {
            showMessage(data.message, data.type || "danger", data.ttl || 3000);
          });

          function showMessage(msg, type, ttl) {
            var obj = {
              type: type || "danger",
              msg: msg || "",
              id: Math.random()
            };

            //next tick
            $timeout(function () {
              $scope.alerts.push(obj);
              $timeout(function () {
                for (var i = 0; i < $scope.alerts.length; i++) {
                  if ($scope.alerts[i] == obj) {
                    $scope.alerts.splice(i, 1);
                    break;
                  }
                }
              }, ttl || 3000);
            }, 0);
          }
        }
      ]
    };

    function linkFn(scope, ele, attr) {}
  })
  .factory(TOAST_FACTORY_NAME, [
    "$rootScope",
    function ($rootScope) {
      return {
        success: function (msg, ttl) {
          sendMessage(msg, "success", ttl);
        },
        info: function (msg, ttl) {
          sendMessage(msg, "info", ttl);
        },
        warn: function (msg, ttl) {
          sendMessage(msg, "warning", ttl);
        },
        warning: function (msg, ttl) {
          sendMessage(msg, "warning", ttl);
        },
        error: function (msg, ttl) {
          sendMessage(msg, "danger", ttl);
        }
      };

      function sendMessage(msg, type, ttl) {
        $rootScope.$broadcast("message", {
          message: msg,
          type: type,
          ttl: ttl
        });
      }
    }
  ]);
