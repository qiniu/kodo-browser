angular.module("web").factory("ExternalPath", [
    "$q",
    "$translate",
    "AuthInfo",
    "Config",
    function($q, $translate, AuthInfo, Config) {
        const fs = require('fs'),
              path = require('path'),
              T = $translate.instant;

        class ExternalPath {
            constructor(bucketId, objectPrefix, regionId) {
                this.bucketId = bucketId;
                this.objectPrefix = objectPrefix;
                this.regionId = regionId;
                this.shortPath = bucketId;
                if (objectPrefix) {
                    this.shortPath += `/${objectPrefix}`;
                }
                this.fullPath = `kodo://${this.shortPath}`;
            }
        }

        return {
            list: list,
            listSync: listSync,
            getRegionByBucketSync: getRegionByBucketSync,
            create: create,
            remove: remove,
            new: newExternalPath,
        };

        function list() {
            const df = $q.defer(),
                  filePath = getFilePath();
            fs.access(filePath, fs.constants.R_OK, (err) => {
                if (err) {
                    df.resolve([]);
                } else {
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            df.reject(err);
                        } else {
                            df.resolve(JSON.parse(data));
                        }
                    });
                }
            });
            return df.promise;
        }

        function listSync() {
            const filePath = getFilePath();

            try {
                fs.accessSync(filePath, fs.constants.R_OK);
            } catch (err) {
                return []
            }

            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        function getRegionByBucketSync(bucketId) {
            const paths = listSync();
            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];
                if (bucketId === path.bucketId) {
                    return path.regionId;
                }
            }
            return null;
        }

        function create(externalPath, regionId) {
            const df = $q.defer(),
                  filePath = getFilePath();

            list().then((paths) => {
                const newOne = newExternalPath(externalPath, regionId);
                for (let i = 0; i < paths.length; i++) {
                    const path = paths[i];
                    if (newOne.bucketId === path.bucketId && newOne.objectPrefix === path.objectPrefix) {
                        df.reject(new Error("Duplicated external path"));
                        return;
                    }
                }
                paths.push(newOne);
                fs.writeFile(filePath, JSON.stringify(paths), 'utf8', (err) => {
                    if (err) {
                        df.reject(err);
                    } else {
                        df.resolve(paths);
                    }
                });
            }, (err) => {
                df.reject(err);
            });
            return df.promise;
        }

        function remove(externalPath, regionId) {
            const df = $q.defer(),
                  filePath = getFilePath();

            list().then((paths) => {
                const target = newExternalPath(externalPath, regionId);
                for (let i = 0; i < paths.length; i++) {
                    const path = paths[i];
                    if (target.bucketId === path.bucketId && target.objectPrefix === path.objectPrefix) {
                        paths.splice(i, 1);
                        break;
                    }
                }
                fs.writeFile(filePath, JSON.stringify(paths), 'utf8', (err) => {
                    if (err) {
                        df.reject(err);
                    } else {
                        df.resolve(paths);
                    }
                });
            }, (err) => {
                df.reject(err);
            });
            return df.promise;
        }

        function newExternalPath(externalPath, regionId) {
            if (externalPath.startsWith('kodo://')) {
                externalPath = externalPath.substring('kodo://'.length);
            }
            let splits = externalPath.split('/', 2);
            return new ExternalPath(splits[0], splits[1] || '', regionId);
        }

        function getFilePath() {
            const username = AuthInfo.get().id || "kodo-browser",
                  folder = Global.config_path;

            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }

            return path.join(folder, `external_paths_${username}.json`);
        }
    }
]);
