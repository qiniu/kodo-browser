const gulp = require("gulp"),
  plugins = require("gulp-load-plugins")({
    lazy: false
  }),
  packager = require('electron-packager'),
  createDMG = require('electron-installer-dmg'),
  archiver = require('archiver'),
  fs = require("fs"),
  pkg = require("./package");

const NAME = 'Kodo Browser';
const KICK_NAME = 'kodo-browser';
const VERSION = pkg.version;
const ELECTRON_VERSION = "4.2.7";
const ROOT = __dirname;
const ICONS = `${ROOT}/src/renderer/icons`;
const DIST = `${ROOT}/dist`;
const TARGET = `${ROOT}/build`;
const RELEASE = `${ROOT}/releases`;

const packagerOptions = {
  dir: DIST,
  name: NAME,
  asar: false,
  out: TARGET,
  overwrite: true,
  download: {
    mirrorOptions: 'https://npm.taobao.org/mirrors/electron/'
  },
  appVersion: VERSION,
  appCopyright: "",
  electronVersion: ELECTRON_VERSION,
  packageManager: "yarn"
};

[DIST, TARGET, RELEASE].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

gulp.task("mac", () => {
  console.log(`--package ${NAME}-darwin-x64`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-darwin-x64`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "darwin";
    options.arch = "x64";
    options.icon = `${ICONS}/icon.icns`;

    packager(options).then((paths) => {
      console.log("--done");
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("maczip", () => {
  console.log(`--package ${KICK_NAME}-darwin-x64-v${VERSION}.zip`);
  var outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-darwin-x64-v${VERSION}.zip`);
  var archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-darwin-x64/${NAME}.app`, `${NAME}.app`);
  archive.finalize();
});

gulp.task("dmg", () => {
  console.log(`--package ${NAME}.dmg`);

  createDMG({
    appPath: `${TARGET}/${NAME}-darwin-x64/${NAME}.app`,
    name: NAME,
    title: `${NAME}, by Qiniu`,
    icon: `${ICONS}/icon.icns`,
    overwrite: true,
    debug: false,
    out: `${TARGET}/${NAME}-darwin-x64-dmg`,
    format: 'ULFO'
  }, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("--done");
    }
  });
});

gulp.task("win64", () => {
  console.log(`--package ${NAME}-win32-x64`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-win32-x64`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "x64";
    options.icon = `${ICONS}/icon.png`;

    packager(options).then((paths) => {
      console.log("--done");
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("win64zip", () => {
  console.log(`--package ${KICK_NAME}-win32-x64-v${VERSION}.zip`);
  var outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-win32-x64-v${VERSION}.zip`);
  var archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-win32-x64`, false);
  archive.finalize();
});

gulp.task("win32", () => {
  console.log(`--package ${NAME}-win32-ia32`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-win32-ia32`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "ia32";
    options.icon = `${ICONS}/icon.png`;

    packager(options).then((paths) => {
      console.log("--done");
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("win32zip", () => {
  console.log(`--package ${KICK_NAME}-win32-x86-v${VERSION}.zip`);
  var outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-win32-x86-v${VERSION}.zip`);
  var archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-win32-ia32`, false);
  archive.finalize();
});

gulp.task("linux64", () => {
  console.log(`--package ${NAME}-linux-x64`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-linux-x64`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "x64";

    packager(options).then((paths) => {
      console.log("--done");
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("linux64zip", () => {
  console.log(`--package ${KICK_NAME}-linux-x64-v${VERSION}.zip`);
  var outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-linux-x64-v${VERSION}.zip`);
  var archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-linux-x64`, false);
  archive.finalize();
});

gulp.task("linux32", () => {
  console.log(`--package ${NAME}-linux-ia32`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-linux-ia32`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "ia32";

    packager(options).then((paths) => {
      console.log("--done");
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("linux32zip", () => {
  console.log(`--package ${KICK_NAME}-linux-x86-v${VERSION}.zip`);
  var outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-linux-x86-v${VERSION}.zip`);
  var archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-linux-ia32`, false);
  archive.finalize();
});
