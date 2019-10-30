const assert = require('assert'),
      async = require('async'),
      fs = require('fs'),
      Readable = require('stream').Readable,
      {
        ThrottleGroup
      } = require('stream-throttle');

// Set the S3 client to be used for this ReadableStream.
class ReadableStream {
  constructor(client) {
    this.client = client;
  }

  download(params, config) {
    const client = this.client;

    if (!config) config = {};

    const maxRetries = config.maxRetries ? config.maxRetries : 3;
    const partSize = config.partSize ? config.partSize : 1 << 22; // 4 MB
    const maxConcurrentStreams = config.maxConcurrentStreams ? config.maxConcurrentStreams : 5;
    const objectSize = config.totalObjectSize ? config.totalObjectSize : 0;
    const downloaded = config.totalBytesDownloaded ? config.totalBytesDownloaded : 0;
    const throttleGroup = config.speedLimit ? new ThrottleGroup({rate: config.speedLimit * 1024}) : null;

    const rs = new Readable({ highWaterMark: 1 << 22 });
    const downloadPart = function(callback) {
      const context = this;
      const params = Object.assign({}, context.params);
      const part = new Buffer(context.size);
      let partLen = 0;
      let haveCallbacked = false;

      const httpGet = function() {
        const expectedSize = context.size - partLen;
        let actualSize = 0;
        params.Range = `bytes=${context.lowerBound + partLen}-${context.upperBound}`;
        rs.emit('debug', { req: 'start', from: context.lowerBound + partLen, to: context.upperBound, partId: context.partId });
        let stream = client.getObject(params).createReadStream();
        if (throttleGroup) {
          stream = stream.pipe(throttleGroup.throttle());
        }
        stream.on('data', (chunk) => {
          rs.emit('progress', { loaded: chunk.length });
          chunk.copy(part, partLen);
          partLen += chunk.length;
          actualSize += chunk.length;
        });
        stream.on('error', (err) => {
          if (!haveCallbacked) {
            haveCallbacked = true;
            callback(err);
          }
        })
        stream.on('end', () => {
          if (!haveCallbacked) {
            if (actualSize == 0) {
              const err = new Error(`${context.partId}: get empty response body`);
              rs.emit('debug', {error: err.message});
              haveCallbacked = true;
              callback(err);
            } else if (partLen != context.size) {
              const err = new Error(`${context.partId}: part size mismatch, expected: ${expectedSize}, actual: ${actualSize}`);
              rs.emit('debug', {error: err.message});
              httpGet();
            } else {
              rs.emit('debug', { req: 'done', partId: context.partId });
              haveCallbacked = true;
              callback(null, Object.assign({responseBody: part}, context));
            }
          }
        });
      };
      httpGet();
    };

    const downloadBlock = function(blockId, offset, callback) {
      const partDownloaders = [];
      for (let i = 0; i < maxConcurrentStreams; i++) {
        const lowerBound = offset + i * partSize;
        const upperBound = Math.min(lowerBound + partSize - 1, objectSize - 1);
        partDownloaders.push(downloadPart.bind({
          partId: blockId * maxConcurrentStreams + i,
          lowerBound: lowerBound, upperBound: upperBound,
          size: upperBound - lowerBound + 1,
          params: Object.assign({}, params)
        }));

        if (upperBound >= objectSize - 1) {
          break;
        }
      }

      async.parallel(partDownloaders, (err, results) => {
        if (err) {
          callback(err);
          return;
        }

        results.forEach((result, i) => {
          rs.push(result.responseBody);
        });

        rs.emit('partDownloaded', {
          size: results.reduce((sum, result) => { return sum + result.responseBody.length; }, 0),
        });

        callback(null, results);
      });
    };

    let downloading = false;
    rs._read = () => {
      if (downloading) return;
      downloading = true;

      const worker = function(callback) {
        downloadBlock(this.blockId, this.offset, callback);
      };
      const blockSize = maxConcurrentStreams * partSize;
      const blockDownloaders = [];
      for (let blockId = 0, bytesDownloaded = downloaded;
           bytesDownloaded < objectSize;
           blockId += 1, bytesDownloaded += blockSize) {
        blockDownloaders.push(worker.bind({blockId: blockId, offset: bytesDownloaded}));
      }

      async.series(blockDownloaders, (err, results) => {
        rs.push(null);
        downloading = false;
        if (err) {
          rs.destroy(err);
        } else {
          rs.destroy(null);
        }
      });
    };

    return rs;
  }
}

module.exports = {
  ReadableStream: ReadableStream
};
