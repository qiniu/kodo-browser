const assert = require('assert'),
      async = require('async'),
      fs = require('fs'),
      Readable = require('stream').Readable;

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

    const rs = new Readable({ highWaterMark: 1 << 22 });
    const downloadPart = function(callback) {
      const context = this;
      const params = Object.assign({}, context.params);
      params.Range = `bytes=${context.lowerBound}-${context.upperBound}`;

      const request = client.getObject(params);
      request.on('httpData', (part) => {
        rs.emit('progress', { loaded: part.length });
      });
      let called = false;
      request.send((err, response) => {
        if (called) {
          return;
        }
        called = true;
        if (!err && response.Body.length != context.size) {
          callback(new Error(`${context.partId}: part size mismatch, expected: ${context.size}, actual: ${response.Body.length}`));
          response.Body = null;
          console.error(response);
          return;
        }
        callback(err, Object.assign({response: response}, context));
      });
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
          rs.push(result.response.Body);
        });

        rs.emit('partDownloaded', {
          size: results.reduce((sum, result) => { return sum + result.response.Body.length; }, 0),
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
