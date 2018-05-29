const stream = require('stream'),
  util = require('util');

exports.BufferTransform = BufferTransform;

function BufferTransform(options) {
  if (!options) {
    options = {};
  }

  this.size = options.size || 16 << 10; // default to 16k
  this.buf = Buffer.alloc(this.size);
  this.offset = 0;

  stream.Transform.call(this, {
    highWaterMark: this.size,
    objectMode: true
  });
};

util.inherits(BufferTransform, stream.Transform);

BufferTransform.prototype._transform = function _transform(chunk, encoding, callback) {
  if (!this._triggered) {
    this._triggered = true;

    callback(null, chunk);
    return;
  }

  var emptySize = this.size - this.offset;
  if (emptySize > chunk.length) {
    // fill buffer with expected data
    this.offset += chunk.copy(this.buf, this.offset);

    callback(null);
    return;
  }

  // write buffer out
  if (this.offset > 0 && !this.push(this.buf.slice(0, this.offset))) {
    this.emit('error', new Error('write buffer with false.'));
  } else {
    // reset buffer state
    this.offset = 0;
  }

  // write chunk out
  callback(null, chunk);
};

BufferTransform.prototype._flush = function _flush(callback) {
  if (this.offset > 0 && !this.push(this.buf.slice(0, this.offset))) {
    this.emit('error', new Error('write buffer with false.'));
  } else {
    this.offset = 0;
  }

  // end stream
  this.push(null);

  callback();
};