var path = require("path");
var fs = require("fs");
var should = require("should");
var Store = require("../");

//需要到 node/crc64/下运行 npm test
var util = require("../lib/util");

describe("util.js", function() {
  this.timeout(60000);

  describe("parseS3Path", function() {
    it("parseS3Path", function() {
      var obj = util.parseS3Path("s3://abc/123");
      obj.bucket.should.equal("abc");
      obj.key.should.equal("123");
    });
  });
});
