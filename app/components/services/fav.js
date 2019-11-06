angular.module("web").factory("Fav", [
  "$q",
  "AuthInfo",
  "Toast",
  function($q, AuthInfo, Toast) {
    const MAX = 100,
          fs = require("fs"),
          path = require("path"),
          os = require("os");

    return {
      add: add,
      list: list,
      remove: remove,
      has: has
    };

    function has(addr, mode) {
      const arr = list();
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].url === addr && arr[i].mode === mode) {
          return true;
        }
      }
      return false;
    }

    function add(addr, mode) {
      const arr = list();

      if (arr.length >= MAX) {
        return false;
      }

      for (let i = 0; i < arr.length; i++) {
        if (arr[i].url === addr && arr[i].mode === mode) {
          arr.splice(i, 1);
          i--;
        }
      }
      arr.push({ url: addr, mode: mode, time: new Date().getTime() });
      if (arr.length > MAX) {
        arr.splice(MAX, arr.length - MAX);
      }
      save(arr);
      return true;
    }

    function remove(addr, mode) {
      const arr = list();
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].url === addr && arr[i].mode === mode) {
          arr.splice(i, 1);
          i--;
        }
      }
      save(arr);
    }

    function save(arr) {
      try {
        fs.writeFileSync(getFavFilePath(), JSON.stringify(arr));
      } catch (e) {
        Toast.error("保存书签失败:" + e.message);
      }
    }

    function list() {
      try {
        const data = fs.readFileSync(getFavFilePath());
        return JSON.parse(data ? data.toString() : "[]");
      } catch (e) {
        return [];
      }
    }

    //下载进度保存路径
    function getFavFilePath() {
      const folder = Global.config_path;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }
      const username = AuthInfo.get().id || 'kodo-browser';
      return path.join(folder, "fav_" + username + ".json");
    }
  }
]);
