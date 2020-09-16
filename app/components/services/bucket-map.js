angular.module("web").factory("bucketMap", [
    "$q",
    "KodoClient",
    "s3Client",
    function (
        $q,
        KodoClient,
        s3Client
    ) {
        return {
            load: load
        };

        function load() {
            const df = $q.defer();
            s3Client.listAllBuckets().then((buckets) => {
                const m = {};
                let wait = buckets.length;
                if (wait > 0) {
                    const resolve = () => {
                        wait -= 1;
                        if (wait == 0) {
                            df.resolve(m);
                        }
                    };
                    angular.forEach(buckets, (bkt) => {
                        m[bkt.name] = bkt;
                        s3Client.getBucketLocation(bkt.bucketId).then((regionId) => {
                            KodoClient.getRegionEndpointURL(regionId).then(() => { // 确定 RegionId 确实配置存在
                                bkt.region = regionId;
                                resolve();
                            }, (err) => {
                                bkt.region = undefined; // RegionId 可以获取但配置不存在
                                resolve();
                            })
                        }, (err) => {
                            bkt.region = null; // 不能获取到 RegionId
                            resolve();
                        });
                    });
                } else {
                    df.resolve(m);
                }
            }, (err) => {
                df.reject(err);
            });
            return df.promise;
        }
    }
]);
