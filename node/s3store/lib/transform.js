const stream = require('stream'),
  util = require('util');

exports.BufferTransform = BufferTransform;

function BufferTransform(options) {
  if (!(this instanceof BufferTransform)) {
    return new BufferTransform(options);
  }

  if (!options) {
    options = {};
  }
  this.size = options.size || 16 << 10; // default to 16k

  stream.Transform.call(this, {
    objectMode: true
  });

  // @private
  this._buf = Buffer.alloc(this.size);
  this._offset = 0;
  this._triggered = false;
  this._flushed = false;
};

util.inherits(BufferTransform, stream.Transform);

BufferTransform.prototype._transform = function _transform(chunk, encoding, callback) {
  if (!this._triggered) {
    this._triggered = true;

    callback(null, chunk);
    return;
  }

  var emptySize = this.size - this._offset;
  if (emptySize > chunk.length) {
    // fill buffer with expected data
    this._offset += chunk.copy(this._buf, this._offset);

    callback(null);
    return;
  }

  // write buffer out
  if (this._offset > 0 && !this.push(this._buf.slice(0, this._offset))) {
    this.emit('error', new Error('write buffer with false.'));
  } else {
    // reset buffer state
    this._offset = 0;
  }

  // write chunk out
  callback(null, chunk);
};

BufferTransform.prototype._flush = function _flush(callback) {
  if (this._flushed) {
    return;
  }
  this._flushed = true;

  if (this._offset > 0 && !this.push(this._buf.slice(0, this._offset))) {
    this.emit('error', new Error('write buffer with false.'));
  } else {
    this._offset = 0;
  }

  // end stream
  this.push(null);

  callback();
};