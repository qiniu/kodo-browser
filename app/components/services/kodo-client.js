const Qiniu = require("qiniu"),
      each = require("array-each"),
      urllib = require("urllib");

angular.module("web").factory("KodoClient", [
  "$translate",
  "$timeout",
  "$q",
  "Config",
  "AuthInfo",
  function ($translate, $timeout, $q, Config, AuthInfo) {
    const T = $translate.instant;

    // TODO: 改用接口查询，不要写死
    const KodoRegionID2AWSRegionID = {
      'z0': 'cn-east-1',
      'z1': 'cn-north-1',
      'z2': 'cn-south-1',
      'na0': 'us-north-1',
      'as0': 'ap-southeast-1',
    };
    const AWSRegionID2KodoRegionID = {
      'cn-east-1': 'z0',
      'cn-north-1': 'z1',
      'cn-south-1': 'z2',
      'us-north-1': 'na0',
      'ap-southeast-1': 'as0',
    };

    return {
      getBucketIdNameMapper: getBucketIdNameMapper,
      getRegionLabels: getRegionLabels,
      getRegionEndpointURL: getRegionEndpointURL,
      isQueryRegionAPIAvaiable: isQueryRegionAPIAvaiable,
      getAnyBucketInfo: getAnyBucketInfo,
      isBucketPrivate: isBucketPrivate,
      getDomainsManager: getDomainsManager,
      getBucketManager: getBucketManager
    };

    function getBucketIdNameMapper(opts) {
      const df = $q.defer();

      getBucketManager(opts).listBuckets().then((body) => {
        if (body && body.error) {
          df.reject(new Error(body.error));
        } else {
          const m = {};
          each(body, (bucket) => {
            m[bucket.id] = bucket.tbl;
          });
          df.resolve(m);
        }
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }


    function getRegionLabels() {
      const df = $q.defer(),
            loadDefault = AuthInfo.usePublicCloud(),
            regions = Config.load(loadDefault).regions,
            idLabels = [];

      if (loadDefault) {
        each(regions, (region) => {
          const idLabel = {id: region.id, label: region.label};
          if (!idLabel.label) {
            idLabel.label = T(region.id);
          }
          idLabels.push(idLabel);
        });
        $timeout(() => { df.resolve(idLabels); });
      } else {
        getRegionIdDescriptionMapper().then((mapper) => {
          if (regions === null) {
            each(Object.entries(mapper), (regionInfo) => {
              idLabels.push({id: KodoRegionID2AWSRegionID[regionInfo[0]], label: regionInfo[1]});
            });
          } else {
            each(regions, (region) => {
              const idLabel = {id: region.id, label: region.label};
              if (!idLabel.label) {
                idLabel.label = mapper[AWSRegionID2KodoRegionID[region.id]];
              }
              idLabels.push(idLabel);
            });
          }
          df.resolve(idLabels);
        }, (err) => {
          df.reject(err);
        });
      }

      return df.promise;
    }

    function getRegionIdDescriptionMapper(opts) {
      const df = $q.defer();

      getBucketManager(opts).listRegions().then((body) => {
        const m = {};
        each(body.regions, (region) => {
          m[region.id] = region.description;
        });
        df.resolve(m);
      }, (err) => {
        df.reject(err);
      })

      return df.promise;
    }

    function getRegionEndpointURL(bucketId, regionId, authInfo) {
        const df = $q.defer();
        const config = Config.load();

        if (config.regions !== null) {
            $timeout(() => {
                let endpointURL = null;
                angular.forEach(config.regions, (region) => {
                    if (region.id === regionId) {
                        endpointURL = region.endpoint;
                    }
                });
                df.resolve(endpointURL);
            });
        } else {
            queryForAWSDomain(bucketId, authInfo).then((regionInfo) => {
                let scheme = "https://";
                if (config.ucUrl.startsWith("http://")) {
                    scheme = "http://";
                }
                df.resolve(scheme + regionInfo.domain);
            }, (err) => {
                df.reject(err);
            });
        }

        return df.promise;
    }

    function isQueryRegionAPIAvaiable(ucUrl) {
      const df = $q.defer();
      if (!ucUrl) {
        ucUrl = Config.getUcURL();
      }
      urllib.request(`${ucUrl}/v4/query`, {}, (err, _, resp) => {
        if (err) {
          df.reject(err);
        } else if (resp.status === 404) {
          df.resolve(false);
        } else {
          df.resolve(true);
        }
      });
      return df.promise;
    }

    function queryForAWSDomain(bucketId, authInfo) {
      const df = $q.defer();

      queryForDomains(bucketId, authInfo).then((host) => {
        df.resolve({ id: host.s3.region_alias, domain: host.s3.domains[0] });
      }, (err) => {
        df.reject(err);
      })

      return df.promise;
    }

    function queryForDomains(bucketId, authInfo) {
      const df = $q.defer();

      if (typeof authInfo !== 'object' || !authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }

      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret),
            ucUrl = Config.getUcURL();

      getBucketIdNameMapper(authInfo).then((mapper) => {
        const bucketName = mapper[bucketId] || bucketId;
        urllib.request(`${ucUrl}/v4/query`, {
          data: { ak: authInfo.id, bucket: bucketName }, dataAsQueryString: true, dataType: 'json', gzip: true
        }, (err, data) => {
          if (err) {
            df.reject(err);
          } else {
            df.resolve(data.hosts[0]);
          }
        });
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    function getAnyBucketInfo(opts) {
      const df = $q.defer();

      getBucketManager(opts).listBuckets().then((body) => {
        if (body && body.error) {
          df.reject(new Error(body.error));
        } else {
          const bucket = body[0];
          df.resolve({
            bucket: bucket.id,
            region: KodoRegionID2AWSRegionID[bucket.region]
          });
        }
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    function isBucketPrivate(bucketId, authInfo) {
      const df = $q.defer();

      getBucketIdNameMapper(authInfo).then((mapper) => {
        const bucketName = mapper[bucketId] || bucketId;
        getBucketManager(bucketId).getBucketInfo(bucketName).then((bucketInfo) => {
          df.resolve(bucketInfo.private != 0);
        }, (err) => {
          df.reject(err);
        })
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    function getDomainsManager(opts) {
      let authInfo = opts || {};
      if (!authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret);
      const ucUrl = Config.getUcURL();

      return {
        listDomains: (bucketId) => {
          const df = $q.defer();
          queryForDomains(bucketId, authInfo).then((host) => {
            const apiHost = host.api.domains[0];
            let apiUrl = 'https://' + apiHost;
            if (ucUrl.startsWith('http://')) {
              apiUrl = 'http://' + apiHost;
            }
            getBucketIdNameMapper(authInfo).then((mapper) => {
              const bucketName = mapper[bucketId] || bucketId;
              const requestURI = `${apiUrl}/domain?sourceTypes=qiniuBucket&sourceQiniuBucket=${bucketName}&operatingState=success&limit=50`;
              const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
              const headers = { 'Authorization': digest };
              urllib.request(requestURI, {
                method: 'GET', dataType: 'json', contentType: 'application/x-www-form-urlencoded', headers: headers, gzip: true
              }, (err, body) => {
                if (err) {
                  df.reject(err);
                } else {
                  df.resolve(body.domains);
                }
              });
            }, (err) => {
              df.reject(err);
            });
          }, (err) => {
            df.reject(err);
          });
          return df.promise;
        }
      }
    }

    function getBucketManager(opts) {
      let authInfo = opts || {};
      if (!authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret);
      const ucUrl = Config.getUcURL();
      return {
        listRegions: () => {
          const df = $q.defer();
          const requestURI = `${ucUrl}/regions`;
          const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
          Qiniu.rpc.postWithoutForm(requestURI, digest, (err, body) => {
            if (err) {
              df.reject(err);
            } else {
              df.resolve(body);
            }
          });
          return df.promise;
        },
        listBuckets: () => {
          const df = $q.defer();
          const requestURI = `${ucUrl}/v2/buckets`;
          const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
          Qiniu.rpc.postWithoutForm(requestURI, digest, (err, body) => {
            if (err) {
              df.reject(err);
            } else {
              df.resolve(body);
            }
          });
          return df.promise;
        },
        getBucketInfo: (bucketName) => {
          const df = $q.defer();
          const bucketManager = new Qiniu.rs.BucketManager(mac);
          bucketManager.getBucketInfo(bucketName, (err, body) => {
            if (err) {
              df.reject(err);
            } else {
              df.resolve(body);
            }
          });
          return df.promise;
        },
        signatureUrl: (protocol, domain, key, isPrivate, expires) => {
          const bucketManager = new Qiniu.rs.BucketManager(mac);
          const baseUrl = `${protocol}://${domain}`;
          if (isPrivate) {
            return bucketManager.privateDownloadUrl(baseUrl, key, parseInt(Date.now() / 1000) + expires);
          } else {
            return bucketManager.publicDownloadUrl(baseUrl, key);
          }
        }
      };
    }
  }
]);
