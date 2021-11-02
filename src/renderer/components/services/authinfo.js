import webModule from '@/app-module/web'
import Const from '@/const'

import Cipher from './cipher'

const AUTH_INFO_FACTORY_NAME = 'AuthInfo'

webModule.factory(AUTH_INFO_FACTORY_NAME, [
  "$q",
  Const,
  Cipher,
  function ($q, Const, Cipher) {
    var AUTH_INFO = Const.AUTH_INFO_KEY;
    var CLOUD_CHOICE = Const.CLOUD_CHOICE_KEY;

    return {
      get: function () {
        return get(AUTH_INFO);
      },
      save: function (obj) {
        var oldobj = get(AUTH_INFO);
        Object.assign(oldobj, obj);

        save(AUTH_INFO, oldobj);
      },
      remove: function () {
        remove(AUTH_INFO);
      },
      saveToAuthInfo: saveToAuthInfo,

      usePublicCloud: function() {
        return get(CLOUD_CHOICE) === 'default';
      },
      switchToPublicCloud: function() {
        save(CLOUD_CHOICE, 'default');
      },
      switchToPrivateCloud: function() {
        save(CLOUD_CHOICE, 'customized');
      },
    };

    function saveToAuthInfo(opt) {
      var obj = get(AUTH_INFO);
      for (var k in opt) obj[k] = opt[k];
      save(AUTH_INFO, obj);
    }

    ///////////////////////////////
    function remove(key) {
      localStorage.removeItem(key);
    }

    function get(key, defv) {
      var str = localStorage.getItem(key);
      if (str) {
        try {
          str = Cipher.decipher(str);
          return JSON.parse(str);
        } catch (e) {
          console.log(e, str);
        }
      }
      return defv || {};
    }

    function save(key, obj, defv) {
      delete obj["httpOptions"];

      var str = JSON.stringify(obj || defv || {});
      try {
        str = Cipher.cipher(str);
      } catch (e) {
        console.log(e);
      }
      localStorage.setItem(key, str);
    }
  }
]);

export default AUTH_INFO_FACTORY_NAME
