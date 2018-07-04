var assert = require('assert');
var async = require('async');
var Readable = require('stream').Readable;

// Set the S3 client to be used for this ReadableStream.
function ReadableStream(client) {
  if (this instanceof ReadableStream === false) {
    return new ReadableStream(client);
  }

  if (!ReadableStream) {
    throw new Error('Must configure an S3 client before attempting to create an S3 download stream.');
  }

  this._client = client;
}

ReadableStream.prototype.download = function (s3params, config) {
  var _client = this._client;

  if (!config) config = {};

  // variables pertaining to the download.
  var _params = s3params;
  var _maxRetries = config.maxRetries ? config.maxRetries : 3;
  var _maxPartSize = config.maxPartSize ? config.maxPartSize : 4 << 20; //4MB
  var _maxConcurrentStreams = config.maxConcurrentStreams ? config.maxConcurrentStreams : 5;
  var _totalObjectSize = config.totalObjectSize ? config.totalObjectSize : 0;

  var startSeriesDownload = function (series, offset, callback) {
    var functionArray = [];
    var lowerBoundArray = [];
    var upperBoundArray = [];
    var bytesDownloaded = 0;

    for (var i = 0; i < _maxConcurrentStreams; i++) {
      lowerBoundArray.push(i * _maxPartSize + offset);
      upperBoundArray.push(Math.min(lowerBoundArray[i] + _maxPartSize - 1, _totalObjectSize - 1));

      var params = Object.assign({}, _params);

      var func = function (cb) {
        var context = this;

        context.params.Range = `bytes=${context.lowerBound}-${context.upperBound}`;

        var request = _client.getObject(context.params);
        request.on('httpData', (chunk) => {
          bytesDownloaded += chunk.length;

          rs.emit('progress', {
            loaded: chunk.length,
            total: bytesDownloaded
          });
        });
        request.send((err, data) => {
          rs.emit('part', {
            PartNumber: context.partNumber,
            Size: context.upperBound - context.lowerBound
          });

          cb(err, data);
        });
      };

      functionArray.push(async.retry(_maxRetries, func.bind({
        partNumber: series + i,
        lowerBound: lowerBoundArray[i],
        upperBound: upperBoundArray[i],
        params: params
      })));

      if (upperBoundArray[i] >= _totalObjectSize - 1) {
        break;
      }
    }

    async.parallel(functionArray, function (err, results) {
      if (err) {
        callback(err);
        return;
      }

      for (var i = 0; i < results.length; i++) {
        rs.push(results[i].Body);

        rs.emit('partDownloaded', {
          PartNumber: series + i,
          Size: upperBoundArray[i] - lowerBoundArray[i],
          Done: true
        });
      }

      callback(null, "");
    });
  };

  // Create the writable stream interface.
  var rs = new Readable({
    highWaterMark: 4194304 // 4 MB
  });

  rs.maxRetries = function (numRetries) {
    _maxRetries = numRetries;
    return rs;
  };
  rs.getMaxRetries = function () {
    return _maxRetries;
  };
  rs.maxPartSize = function (partSize) {
    if (partSize < 4 << 20) {
      partSize = 4 << 20;
    }
    _maxPartSize = partSize;
    return rs;
  };
  rs.getMaxPartSize = function () {
    return _maxPartSize;
  };
  rs.maxConcurrentStreams = function (numStreams) {
    if (numStreams < 1) {
      numStreams = 1;
    }
    _maxConcurrentStreams = numstreams;
    return rs;
  };
  rs.getMaxConcurrentStreams = function () {
    return _maxConcurrentStreams;
  };
  rs.totalObjectSize = function (size) {
    _totalObjectSize = size;
    return rs;
  };
  rs.getTotalObjectSize = function () {
    return _totalObjectSize;
  };

  // state management
  var downloading = false;

  rs._read = function () {
    if (downloading) return;

    downloading = true;

    assert.notStrictEqual(_params, null, "'s3params' parameter is required.");
    assert.notStrictEqual(_totalObjectSize, 0, "'totalObjectSize' parameter is required.");

    var seriesNumber = 0;
    var bytesDownloaded = 0;
    var functionArray = [];
    while (bytesDownloaded < _totalObjectSize) {
      var func = function (callback) {
        startSeriesDownload(this.series, this.offset, callback);
      };

      functionArray.push(async.retry(_maxRetries, func.bind({
        series: seriesNumber,
        offset: bytesDownloaded
      })));

      seriesNumber += _maxConcurrentStreams;
      bytesDownloaded += _maxConcurrentStreams * _maxPartSize;
    }

    async.series(functionArray, function (err, results) {
      rs.push(null);

      downloading = false;

      if (err) {
        rs.emit('error', err);
      } else {
        rs.emit('downloaded', results);
      }
    });
  };

  return rs;
};

module.exports = {
  ReadableStream: ReadableStream
};