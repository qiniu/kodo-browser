import CodeMirror from '@/libCompatible/codemirror'

import webModule from '@/app-module/web'

import { diffModalHtmlMapping } from "@template-mappings/components/services"

import './diff-modal.css'

const DIFF_MODAL_FACTORY_NAME = 'DiffModal'

webModule
  .factory(DIFF_MODAL_FACTORY_NAME, [
    "$uibModal",
    function ($modal) {
      return {
        /**
         * @param title
         * @param originalContent
         * @param content
         * @param callback
         * @param editable
         */
        show: function (title, originalContent, content, callback, editable) {
          editable = editable === false ? false : true;

          $modal.open({
            templateUrl: diffModalHtmlMapping.path,
            controller: "diffModalCtrl",
            size: "lg",
            resolve: {
              title: function () {
                return title || "Diff";
              },
              editable: function () {
                return editable;
              },
              originalContent: function () {
                return originalContent;
              },
              content: function () {
                return content;
              },
              callback: function () {
                return function (v) {
                  if (editable) callback(v);
                  else callback();
                };
              }
            }
          }).result.then(angular.noop, angular.noop);
        }
      };
    }
  ])
  .controller("diffModalCtrl", [
    "$scope",
    "$uibModalInstance",
    "$timeout",
    "title",
    "editable",
    "originalContent",
    "content",
    "callback",
    function (
      $scope,
      $modalInstance,
      $timeout,
      title,
      editable,
      originalContent,
      content,
      callback
    ) {
      angular.extend($scope, {
        title: title || "Diff",
        originalContent: originalContent,
        content: content,
        initUI: initUI,
        editable: editable,

        ok: ok,
        cancel: cancel
      });

      var editor;

      function initUI() {
        $timeout(function () {
          editor = CodeMirror.MergeView(document.getElementById("diff-view"), {
            value: content,
            origLeft: originalContent,
            //orig:  content,
            lineNumbers: true,
            mode: "javascript",
            highlightDifferences: true,
            connect: "align",
            collapseIdentical: true,

            //不可编辑
            allowEditingOriginals: false,
            revertButtons: false
          });
        }, 100);
      }

      function cancel() {
        $modalInstance.dismiss("close");
      }

      function ok() {
        callback(editor.editor().getValue());
        $modalInstance.dismiss("close");
      }
    }
  ]);

export default DIFF_MODAL_FACTORY_NAME
