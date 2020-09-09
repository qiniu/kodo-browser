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
          cachedBucketIdNameMapper = {},
          queryRegionAPIAvailabilityCache = {},
          awsDomainCache = {};
          domainsCache = {};
    let regionsMapGot = {},
        kodoRegionID2AWSRegionID = {
          'z0': 'cn-east-1',
          'z1': 'cn-north-1',
          'z2': 'cn-south-1',
          'na0': 'us-north-1',
          'as0': 'ap-southeast-1',
        },
        awsRegionID2KodoRegionID = {
          'cn-east-1': 'z0',
          'cn-north-1': 'z1',
          'cn-south-1': 'z2',
          'us-north-1': 'na0',
          'ap-southeast-1': 'as0',
        },
        awsRegionID2RegionLabel = {
          'cn-east-1': 'East China',
          'cn-north-1': 'North China',
          'cn-south-1': 'South China',
          'us-north-1': 'North America',
          'ap-southeast-1': 'Southeast Asia',
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
          const cacheKey = makeCacheKey(opts);
          cachedBucketIdNameMapper[cacheKey] = {};
          each(body, (bucket) => {
            cachedBucketIdNameMapper[cacheKey][bucket.id] = bucket.tbl;
          });
          df.resolve(cachedBucketIdNameMapper[cacheKey]);
        }
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    function getBucketNameById(id, opts) {
      const df = $q.defer();
            cacheKey = makeCacheKey(opts);
      let name = null;
      if (cachedBucketIdNameMapper[cacheKey]) {
        name = cachedBucketIdNameMapper[cacheKey][id];
      }
      if (name) {
        $timeout(() => { df.resolve(name); });
      } else {
        getBucketIdNameMapper(opts).then((mapper) => {
          name = mapper[id] || id;
          df.resolve(name);
        }, (err) => {
          df.reject(err);
        })
      }
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
        getRegionsMap().then((maps) => {
          if (regions === null) {
            each(Object.entries(maps.awsRegionID2RegionLabel), (regionInfo) => {
              idLabels.push({id: regionInfo[0], label: regionInfo[1]});
            });
          } else {
            each(regions, (region) => {
              const idLabel = {id: region.id, label: region.label};
              if (!idLabel.label) {
                idLabel.label = maps.awsRegionID2RegionLabel[region.id];
              }
              idLabels.push(idLabel);
            });
          }
          df.resolve(idLabels);
        });
      }

      return df.promise;
    }

    function getRegionEndpointURL(bucketId, regionId, authInfo) {
        authInfo = authInfo || {};

        const config = Config.load(authInfo.public),
              df = $q.defer();

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

    function isQueryRegionAPIAvaiable(ucUrl, opts) {
      if (!ucUrl) {
        opts = opts || {};
        ucUrl = Config.getUcURL(opts.public);
      }
      const df = $q.defer(),
            cache = queryRegionAPIAvailabilityCache[ucUrl];
      if (cache === undefined || cache === null) {
        urllib.request(`${ucUrl}/v4/query`, {}, (err, _, resp) => {
          if (err) {
            df.resolve(false);
          } else if (resp.status === 404) {
            queryRegionAPIAvailabilityCache[ucUrl] = false;
            df.resolve(false);
          } else {
            queryRegionAPIAvailabilityCache[ucUrl] = true;
            df.resolve(true);
          }
        });
      } else {
        $timeout(() => { df.resolve(cache); });
      }
      return df.promise;
    }

    function queryForAWSDomain(bucketId, authInfo) {
      const df = $q.defer(),
            cacheKey = makeCacheKey(authInfo, bucketId),
            cache = awsDomainCache[cacheKey];

      if (cache) {
        $timeout(() => { df.resolve(cache); });
      } else {
        queryForDomains(bucketId, authInfo).then((host) => {
          awsDomainCache[cacheKey] = { id: host.s3.region_alias, domain: host.s3.domains[0] };
          df.resolve(awsDomainCache[cacheKey]);
        }, (err) => {
          df.reject(err);
        })
      }

      return df.promise;
    }

    function queryForDomains(bucketId, authInfo) {
      const df = $q.defer();

      if (typeof authInfo !== 'object' || !authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }

      const cacheKey = makeCacheKey(authInfo, bucketId),
            cache = domainsCache[cacheKey];

      if (cache) {
        $timeout(() => { df.resolve(cache); });
      } else {
        const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret),
              ucUrl = Config.getUcURL(authInfo.public);

        getBucketNameById(bucketId, authInfo).then((bucketName) => {
          urllib.request(`${ucUrl}/v4/query`, {
            data: { ak: authInfo.id, bucket: bucketName }, dataAsQueryString: true, dataType: 'json', gzip: true
          }, (err, data) => {
            if (err) {
              df.reject(err);
            } else if (data.error) {
              df.reject(new Error(data.error));
            } else {
              domainsCache[cacheKey] = data.hosts[0];
              df.resolve(data.hosts[0]);
            }
          });
        }, (err) => {
          df.reject(err);
        });
      }

      return df.promise;
    }

    function getAnyBucketInfo(opts) {
      const df = $q.defer();

      getBucketManager(opts).listBuckets().then((body) => {
        if (body && body.error) {
          df.reject(new Error(body.error));
        } else {
          const bucket = body[0];
          getRegionsMap(opts).then((maps) => {
            df.resolve({
              bucket: bucket.id,
              region: maps.kodoRegionID2AWSRegionID[bucket.region]
            });
          });
        }
      }, (err) => {
        df.reject(err);
      });

      return df.promise;
    }

    function isBucketPrivate(bucketId, authInfo) {
      const df = $q.defer();

      getBucketNameById(bucketId, authInfo).then((bucketName) => {
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

    function getRegionsMap(opts) {
      const df = $q.defer(),
            resolve = () => {
              df.resolve({
                kodoRegionID2AWSRegionID: kodoRegionID2AWSRegionID,
                awsRegionID2KodoRegionID: awsRegionID2KodoRegionID,
                awsRegionID2RegionLabel: awsRegionID2RegionLabel
              });
            };

      opts = opts || {};
      if (regionsMapGot[Config.getUcURL(opts.public)]) {
        $timeout(resolve);
      } else {
        getBucketManager(opts).listRegions().then((body) => {
          regionsMapGot[Config.getUcURL(opts.public)] = true;
          if (body.regions.find((region) => !region.s3)) {
            resolve();
            return;
          }
          kodoRegionID2AWSRegionID = {};
          awsRegionID2KodoRegionID = {};
          awsRegionID2RegionLabel = {};
          each(body.regions, (region) => {
            kodoRegionID2AWSRegionID[region.id] = region.s3;
            awsRegionID2KodoRegionID[region.s3] = region.id;
            awsRegionID2RegionLabel[region.s3] = region.description;
          });
          resolve();
        }, () => {
          resolve();
        });
      }

      return df.promise;
    }

    function getDomainsManager(opts) {
      let authInfo = opts || {};
      if (!authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret),
            ucUrl = Config.getUcURL(authInfo.public);

      return {
        listDomains: (bucketId) => {
          const df = $q.defer();
          queryForDomains(bucketId, authInfo).then((host) => {
            const apiHost = host.api.domains[0];
            let apiUrl = 'https://' + apiHost;
            if (ucUrl.startsWith('http://')) {
              apiUrl = 'http://' + apiHost;
            }
            getBucketNameById(bucketId, authInfo).then((bucketName) => {
              const requestURI = `${apiUrl}/domain?sourceTypes=qiniuBucket&sourceQiniuBucket=${bucketName}&operatingState=success&limit=50`,
                    digest = Qiniu.util.generateAccessToken(mac, requestURI, null),
                    headers = { 'Authorization': digest };
              urllib.request(requestURI, {
                method: 'GET', dataType: 'json', contentType: 'application/x-www-form-urlencoded', headers: headers, gzip: true
              }, (err, body) => {
                if (err) {
                  df.reject(err);
                } else if (body.error) {
                  df.reject(new Error(body.error));
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
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret),
            ucUrl = Config.getUcURL(authInfo.public);
      return {
        listRegions: () => {
          const df = $q.defer(),
                requestURI = `${ucUrl}/regions`,
                digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
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
          const df = $q.defer(),
                requestURI = `${ucUrl}/v2/buckets`,
                digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
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
          const df = $q.defer(),
                bucketManager = new Qiniu.rs.BucketManager(mac);
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
          const bucketManager = new Qiniu.rs.BucketManager(mac),
                baseUrl = `${protocol}://${domain}`;
          if (isPrivate) {
            return bucketManager.privateDownloadUrl(baseUrl, key, parseInt(Date.now() / 1000) + expires);
          } else {
            return bucketManager.publicDownloadUrl(baseUrl, key);
          }
        }
      };
    }

    function makeCacheKey(opts, extra) {
      let authInfo = opts || {};
      if (!authInfo.id || !authInfo.secret) {
        authInfo = AuthInfo.get();
      }
      const ucUrl = Config.getUcURL(authInfo.public);
      return `${authInfo.id}${authInfo.secret}${ucUrl}${extra}`;
    }
  }
]);
