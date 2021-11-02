import webModule from '@/app-module/web'

import indexDBSvs from './index-db'

const SUB_USER_AK_SVS_FACTORY_NAME = 'subUserAKSvs'

webModule.factory(SUB_USER_AK_SVS_FACTORY_NAME, [
  indexDBSvs,
  function(indexDBSvs) {
    var DBNAME = "subUserAkList";
    var DBVERSION = 1;
    var STORENAME = "subUserAK";
    var INITSTORE = { subUserAK: { keyPath: "AccessKeyId" } };
    return {
      save: save,
      get: get,
      list: list,
      delete: del
    };

    function list() {
      return indexDBSvs.open(DBNAME, DBVERSION, INITSTORE).then(function(db) {
        return indexDBSvs.list(db, STORENAME);
      });
    }
    function save(data) {
      return indexDBSvs.open(DBNAME, DBVERSION, INITSTORE).then(function(db) {
        return indexDBSvs.update(db, STORENAME, data["AccessKeyId"], data);
      });
    }
    function get(AccessKeyId) {
      return indexDBSvs.open(DBNAME, DBVERSION, INITSTORE).then(function(db) {
        return indexDBSvs.get(db, STORENAME, AccessKeyId);
      });
    }
    function del(AccessKeyId) {
      return indexDBSvs.open(DBNAME, DBVERSION, INITSTORE).then(function(db) {
        return indexDBSvs.delete(db, STORENAME, AccessKeyId);
      });
    }
  }
]);

export default SUB_USER_AK_SVS_FACTORY_NAME
