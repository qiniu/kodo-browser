angular.module("web").factory("bucketMap", [
    "$q",
    "AuthInfo",
    "s3Client",
    function (
        $q,
        AuthInfo,
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
                    angular.forEach(buckets, (bkt) => {
                        m[bkt.name] = bkt;
                        s3Client.getBucketLocation(bkt.bucketId).then((regionId) => {
                            bkt.region = regionId;
                            wait -= 1;
                            if (wait == 0) {
                                df.resolve(m);
                            }
                        }, (err) => {
                            wait -= 1;
                            df.reject(err);
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
