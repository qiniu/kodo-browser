angular.module("web").factory("AkHistory", [function() {
    const fs = require('fs'),
          path = require('path');

    class AkHistory {
        constructor(isPublicCloud, accessKeyId, accessKeySecret, description) {
            this.isPublicCloud = isPublicCloud;
            this.accessKeyId = accessKeyId;
            this.accessKeySecret = accessKeySecret;
            this.description = description;
        }
    }

    return {
        list: list,
        add: add,
        remove: remove,
        clearAll: clearAll,
    };

    function list() {
        const filePath = getFilePath();
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        } catch (err) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data).historyItems || [];
    }

    function add(isPublicCloud, accessKeyId, accessKeySecret, description) {
        const histories = list();
        let found = false;
        for (let i = 0; i < histories.length; i++) {
            if (histories[i].accessKeyId === accessKeyId) {
                histories[i].isPublicCloud = isPublicCloud;
                histories[i].accessKeySecret = accessKeySecret;
                histories[i].description = description;
                found = true;
                break;
            }
        }
        if (!found) {
            histories.push(new AkHistory(isPublicCloud, accessKeyId, accessKeySecret, description));
        }
        writeHistories(histories);
    }

    function remove(accessKeyId) {
        const histories = list();
        for (let i = 0; i < histories.length; i++) {
            if (histories[i].accessKeyId === accessKeyId) {
                histories.splice(i, 1);
                break;
            }
        }
        writeHistories(histories);
    }

    function clearAll() {
        writeHistories([]);
    }

    function getFilePath() {
        const folder = Global.config_path;

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        return path.join(folder, 'ak_histories.json');
    }

    function writeHistories(histories) {
        fs.writeFileSync(getFilePath(), JSON.stringify({historyItems: histories}));
    }
}]);
