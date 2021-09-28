import angular from 'angular'

import webModule from '@/app-module/web'

import Bookmark from '@/components/services/bookmark'
import AuthInfo from '@/components/services/authinfo'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import settingsSvs from '@/components/services/settings'

import './address-bar.css'

const ADDRESS_BAR_CONTROLLER_NAME = 'addressBarCtrl'

webModule
  .controller(ADDRESS_BAR_CONTROLLER_NAME, [
    '$scope',
    '$translate',
    Bookmark,
    AuthInfo,
    Toast,
    settingsSvs,
    function ($scope, $translate, Bookmark, AuthInfo, Toast, settingsSvs) {

      const KODO_ADDR_PROTOCOL = 'kodo://',
            T = $translate.instant;

      angular.extend($scope, {
        address: KODO_ADDR_PROTOCOL,
        goUp: goUp,
        go: go,
        goHome: goHome,
        saveDefaultAddress: saveDefaultAddress,
        getDefaultAddress: getDefaultAddress,

        marked: marked,
        toggleMark: toggleMark,

        //历史，前进，后退
        canGoAhead: false,
        canGoBack: false,
        goBack: goBack,
        goAhead: goAhead
      });


      function marked() {
        const addressAndMode = getCurrentAddressAndMode();
        return Bookmark.marked(addressAndMode.address, addressAndMode.mode);
      }

      function toggleMark() {
        const addressAndMode = getCurrentAddressAndMode();
        if (Bookmark.marked(addressAndMode.address, addressAndMode.mode)) {
          Bookmark.remove(addressAndMode.address, addressAndMode.mode);
          Toast.warn(T('bookmark.remove.success')); //'已删除书签'
        } else {
          Bookmark.add(addressAndMode.address, addressAndMode.mode);
          Toast.success(T('bookmark.add.success'));//'添加书签成功'
        }
      }

      /************ 历史记录前进后退 start **************/
      const His = new function () {
        const arr = [];
        let index = -1;
        this.add = function (url, mode) {
          if (index > -1 && url === arr[index].url && mode === arr[index].mode) {
            return;
          }
          if (index < arr.length - 1) {
            arr.splice(index + 1, arr.length - index);
          }
          arr.push({ url: url, mode: mode, time: new Date().getTime() });
          index++;

          const MAX = settingsSvs.historiesLength.get();
          if (arr.length > MAX) {
            arr.splice(MAX, arr.length - MAX);
            index = arr.length - 1;
          }

          this._change(index, arr);
        };
        this.clear = function () {
          arr = [];
          index = -1;
          this._change(index, arr);
        };
        this.list = function () {
          return JSON.parse(JSON.stringify(arr));
        };
        this.goBack = function () {
          if (arr.length == 0) return null;
          if (index > 0) {
            index--;
            this._change(index, arr);
          }
          return arr[index];
        };
        this.goAhead = function () {
          if (arr.length == 0) return null;
          if (index < arr.length - 1) {
            index++;
            this._change(index, arr);
          }
          return arr[index];
        };

        //监听事件
        this.onChange = function (fn) {
          this._change = fn;
        };
      };

      His.onChange(function (index, arr) {
        //console.log('histories changed:', index, arr)
        if (arr.length == 0) {
          $scope.canGoBack = false;
          $scope.canGoAhead = false;
        } else {
          $scope.canGoBack = index > 0;
          $scope.canGoAhead = index < arr.length - 1;
        }
      });

      function goBack() {
        var addr = His.goBack();
        //console.log('-->',addr);
        $scope.address = addr.url;
        $scope.ref.mode = addr.mode;
        $scope.$emit('kodoAddressChange', addr.url);
      }
      function goAhead() {
        var addr = His.goAhead();
        //console.log('-->',addr);
        $scope.address = addr.url;
        $scope.ref.mode = addr.mode;
        $scope.$emit('kodoAddressChange', addr.url);
      }
      /************ 历史记录前进后退 end **************/


      $scope.$on('filesViewReady', function () {

        goHome();

        $scope.$on('gotoLocalMode', function (e) {
          console.log('on:gotoLocalMode');
          $scope.address = KODO_ADDR_PROTOCOL;
          $scope.ref.mode = 'localBuckets';
          go();
        });

        $scope.$on('gotoExternalMode', function (e) {
          console.log('on:gotoExternalMode');
          $scope.address = KODO_ADDR_PROTOCOL;
          $scope.ref.mode = 'externalPaths';
          go();
        });

        $scope.$on('gotoKodoAddress', function (e, addr) {
          console.log('on:gotoKodoAddress', addr);
          $scope.address = addr;
          go();
        });
      });

      function goHome() {
        const addressAndMode = getDefaultAddress();
        $scope.address = addressAndMode.address;
        $scope.ref.mode = addressAndMode.mode;
        go();
      }

      //保存默认地址
      function saveDefaultAddress() {
        AuthInfo.saveToAuthInfo(getCurrentAddressAndMode());
        Toast.success(T('saveAsHome.success'), 1000); //'设置默认地址成功'
      }
      function getDefaultAddress() {
        const info = AuthInfo.get();
        if (info.address && info.mode) {
          return { address: info.address, mode: info.mode };
        } else {
          return { address: KODO_ADDR_PROTOCOL, mode: 'localBuckets' };
        }
      }

      //修正并获取 address
      function getCurrentAddressAndMode() {
        let addr = $scope.address;
        if (!addr) {
          $scope.address = KODO_ADDR_PROTOCOL;
        } else if (addr == KODO_ADDR_PROTOCOL) {
          // do nothing
        } else if (addr.indexOf(KODO_ADDR_PROTOCOL) !== 0) {
          addr = addr.replace(/(^\/*)|(\/*$)/g, '');
          $scope.address = addr ? (KODO_ADDR_PROTOCOL + addr + '/') : KODO_ADDR_PROTOCOL;
        }
        return { address: $scope.address, mode: $scope.ref.mode };
      }

      //浏览
      function go() {
        const addressAndMode = getCurrentAddressAndMode();
        His.add(addressAndMode.address, addressAndMode.mode); //历史记录
        $scope.$emit('kodoAddressChange', addressAndMode.address);
      }
      //向上
      function goUp() {
        const addressAndMode = getCurrentAddressAndMode();
        if (addressAndMode.address == KODO_ADDR_PROTOCOL) {
          return go();
        }

        addressAndMode.address = addressAndMode.address.substring(KODO_ADDR_PROTOCOL.length);
        addressAndMode.address = addressAndMode.address.replace(/(^\/?)|(\/?$)/g, '');

        const splits = addressAndMode.address.split('/');

        splits.pop();

        if (splits.length === 0) {
          addressAndMode.address = KODO_ADDR_PROTOCOL;
        } else {
          addressAndMode.address = KODO_ADDR_PROTOCOL + splits.join('/') + '/';
        }
        $scope.address = addressAndMode.address;
        go();
      }
    }]);

export default ADDRESS_BAR_CONTROLLER_NAME
