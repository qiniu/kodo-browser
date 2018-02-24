var path = require("path"),
  fs = require("fs"),
  crypto = require("crypto");

module.exports = {
  parseLocalPath: parseLocalPath,
  parseS3Path: parseS3Path,
  md5sumFile: md5sumFile,
  checksumFile: checksumFile,
  printPartTimeLine: printPartTimeLine
};

function parseLocalPath(p) {
  if (typeof p != "string") {
    return p;
  }

  return {
    name: path.basename(p),
    path: p
  };
}

function parseS3Path(s3path) {
  if (typeof s3path != "string") {
    return s3path;
  }

  if (!s3path.startsWith("kodo://")) {
    throw Error("Invalid oss path");
  }

  var a = s3path.substring("kodo://".length);
  var bucket = a.split("/", 1)[0];
  var key = a.substring(bucket.length + 1);
  return {
    bucket: bucket,
    key: key
  };
}

function printPartTimeLine(opt) {
  var min = opt[1].start,
    max = opt[1].end;
  for (var k in opt) {
    min = Math.min(opt[k].start, min);
    max = Math.max(opt[k].end, max);
  }
  //console.log(min, max)

  var total = max - min;
  var width = 600;

  var t = [];
  for (var k in opt) {
    t.push({
      left: (opt[k].start - min) * 600 / total,
      width: (opt[k].end - opt[k].start) * 600 / total
    });
  }

  //console.log(JSON.stringify(t, ' ',2));

  //var t2=[];
  for (var n of t) {
    console.log(
      "%c",
      `background:green;margin-left:${n.left}px;padding-left:${n.width}px;`
    );
    //t2.push(`<div style="height:6px;background:green;width:${n.width}px;margin-left:${n.left}px;clear:both;margin-top:1px;"></div>`)
  }
  console.log(t.length + " parts");
}

function checksumFile(filePath, fileMD5, fn) {
  if (fileMD5) {
    //检验MD5
    md5sumFile(filePath, function (err, md5str) {
      if (err) {
        fn(new Error("Checking md5 failed: " + err.message));
      } else if ('"' + md5str + '"' != fileMD5) {
        fn(
          new Error(
            "ContentMD5 mismatch, file md5 should be:" +
            fileMD5 +
            ", but we got:" +
            md5str
          )
        );
      } else {
        console.info("check md5 success: file[" + filePath + "]," + md5str);
        fn(null);
      }
    });
  } else {
    //没有MD5，不校验
    console.log(filePath, ",not found content md5, just pass");

    fn(null);
  }

  return;
}

function md5sumFile(filename, fn) {
  var md5sum = crypto.createHash("md5");
  var stream = fs.createReadStream(filename);

  console.time("gen md5 hash for [" + filename + "]");
  stream.on("data", function (chunk) {
    md5sum.update(chunk);
  });
  stream.on("end", function () {
    str = md5sum.digest("hex");
    console.timeEnd("gen md5 hash for [" + filename + "]");

    fn(null, str);
  });
  stream.on("error", function (err) {
    fn(err);
  });
}