import ng from '@/libCompatible/ng'

import CodeMirror from './codemirror.ts'

const angular = ng

// this is fork from https://github.com/angular-ui/ui-codemirror/blob/892b096cac3ec0e01c8917a9b31fde72091d1c76/src/ui-codemirror.js
// the source has a ngInject bug when angular ≥ v1.4,
// and it has been archived so that I can't open an PR
// so this file is here, what changed are:
// 1. see 'I changed this line to'
// 2. all `window.CodeMirror` change to `CodeMirror`
//
// -- lihs @2021-10-19 16:58:43

/**
 * Binds a CodeMirror widget to a <textarea> element.
 */
const uiCodemirror = ng.module('ui.codemirror', [])

uiCodemirror.constant('uiCodemirrorConfig', {})
  // .directive('uiCodemirror', uiCodemirrorDirective);
  // I changed this line to
  .directive('uiCodemirror', ['$timeout', 'uiCodemirrorConfig', uiCodemirrorDirective]);

/**
 * @ngInject
 */
function uiCodemirrorDirective($timeout, uiCodemirrorConfig) {

  return {
    restrict: 'EA',
    require: '?ngModel',
    compile: function compile() {

      // Require CodeMirror
      if (angular.isUndefined(CodeMirror)) {
        throw new Error('ui-codemirror needs CodeMirror to work... (o rly?)');
      }

      return postLink;
    }
  };

  function postLink(scope, iElement, iAttrs, ngModel) {

    var codemirrorOptions = angular.extend(
      { value: iElement.text() },
      uiCodemirrorConfig.codemirror || {},
      scope.$eval(iAttrs.uiCodemirror),
      scope.$eval(iAttrs.uiCodemirrorOpts)
    );

    var codemirror = newCodemirrorEditor(iElement, codemirrorOptions);

    configOptionsWatcher(
      codemirror,
      iAttrs.uiCodemirror || iAttrs.uiCodemirrorOpts,
      scope
    );

    configNgModelLink(codemirror, ngModel, scope);

    configUiRefreshAttribute(codemirror, iAttrs.uiRefresh, scope);

    // Allow access to the CodeMirror instance through a broadcasted event
    // eg: $broadcast('CodeMirror', function(cm){...});
    scope.$on('CodeMirror', function(event, callback) {
      if (angular.isFunction(callback)) {
        callback(codemirror);
      } else {
        throw new Error('the CodeMirror event requires a callback function');
      }
    });

    // onLoad callback
    if (angular.isFunction(codemirrorOptions.onLoad)) {
      codemirrorOptions.onLoad(codemirror);
    }
  }

  function newCodemirrorEditor(iElement, codemirrorOptions) {
    var codemirrot;

    if (iElement[0].tagName === 'TEXTAREA') {
      // Might bug but still ...
      codemirrot = CodeMirror.fromTextArea(iElement[0], codemirrorOptions);
    } else {
      iElement.html('');
      codemirrot = new CodeMirror(function(cm_el) {
        iElement.append(cm_el);
      }, codemirrorOptions);
    }

    return codemirrot;
  }

  function configOptionsWatcher(codemirrot, uiCodemirrorAttr, scope) {
    if (!uiCodemirrorAttr) { return; }

    var codemirrorDefaultsKeys = Object.keys(CodeMirror.defaults);
    scope.$watch(uiCodemirrorAttr, updateOptions, true);
    function updateOptions(newValues, oldValue) {
      if (!angular.isObject(newValues)) { return; }
      codemirrorDefaultsKeys.forEach(function(key) {
        if (newValues.hasOwnProperty(key)) {

          if (oldValue && newValues[key] === oldValue[key]) {
            return;
          }

          codemirrot.setOption(key, newValues[key]);
        }
      });
    }
  }

  function configNgModelLink(codemirror, ngModel, scope) {
    if (!ngModel) { return; }
    // CodeMirror expects a string, so make sure it gets one.
    // This does not change the model.
    ngModel.$formatters.push(function(value) {
      if (angular.isUndefined(value) || value === null) {
        return '';
      } else if (angular.isObject(value) || angular.isArray(value)) {
        throw new Error('ui-codemirror cannot use an object or an array as a model');
      }
      return value;
    });


    // Override the ngModelController $render method, which is what gets called when the model is updated.
    // This takes care of the synchronizing the codeMirror element with the underlying model, in the case that it is changed by something else.
    ngModel.$render = function() {
      //Code mirror expects a string so make sure it gets one
      //Although the formatter have already done this, it can be possible that another formatter returns undefined (for example the required directive)
      var safeViewValue = ngModel.$viewValue || '';
      codemirror.setValue(safeViewValue);
    };


    // Keep the ngModel in sync with changes from CodeMirror
    codemirror.on('change', function(instance) {
      var newValue = instance.getValue();
      if (newValue !== ngModel.$viewValue) {
        scope.$evalAsync(function() {
          ngModel.$setViewValue(newValue);
        });
      }
    });
  }

  function configUiRefreshAttribute(codeMirror, uiRefreshAttr, scope) {
    if (!uiRefreshAttr) { return; }

    scope.$watch(uiRefreshAttr, function(newVal, oldVal) {
      // Skip the initial watch firing
      if (newVal !== oldVal) {
        $timeout(function() {
          codeMirror.refresh();
        });
      }
    });
  }

}

export default uiCodemirror
