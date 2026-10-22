const gulp = require("gulp"),
  plugins = require("gulp-load-plugins")({
    lazy: false
  }),
  packager = require('electron-packager'),
  createDMG = require('electron-installer-dmg'),
  archiver = require('archiver'),
  fs = require("fs"),
  path = require("path"),
  execFileSync = require("child_process").execFileSync,
  pkg = require("./package");

const NAME = 'Kodo Browser';
const KICK_NAME = 'kodo-browser';
const VERSION = pkg.version;
const ELECTRON_VERSION = "18.3.3";
const ROOT = __dirname;
// https://github.com/qiniu/kodo-browser/issues/135
const WIN_NO_SANDBOX_NAME = "no-sandbox-shortcut.cmd";
const LINUX_DESKTOP_FILE = "create-desktop-file.sh";
const BRAND = `${ROOT}/src/renderer/static/brand`;
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
    mirrorOptions: 'https://repo.huaweicloud.com/electron/'
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

// 递归从内到外为 Mach-O 文件和应用组件补齐临时签名，跳过符号链接。
function signMacApp(appPath) {
  for (const entry of fs.readdirSync(appPath, { withFileTypes: true })) {
    const entryPath = path.join(appPath, entry.name);
    if (entry.isDirectory()) {
      signMacApp(entryPath);
    } else if (entry.isFile() && execFileSync("/usr/bin/file", ["--brief", entryPath], {
      encoding: "utf8"
    }).includes("Mach-O")) {
      execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", entryPath], { stdio: "inherit" });
    }
  }

  if (appPath.endsWith(".app") || appPath.endsWith(".framework")) {
    execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", appPath], { stdio: "inherit" });
  }
}

["x64", "arm64"].forEach(arch => {
  const taskName = arch === "x64" ? "mac" : "mac-arm64";

  // 按目标架构打包，同名目录由 packager 的 overwrite 选项替换。
  gulp.task(taskName, async () => {
    console.log(`--package ${NAME}-darwin-${arch}`);
    let options = Object.assign({}, packagerOptions);
    options.platform = "darwin";
    options.arch = arch;
    options.icon = `${BRAND}/qiniu.icns`;

    options.protocols = [{
      name: 'com.qiniu.browser',
      schemes: [
        'kodo-browser'
      ]
    }];

    const [appPath] = await packager(options);
    if (arch === "arm64") {
      const appBundle = path.join(appPath, `${NAME}.app`);
      signMacApp(appBundle);
      execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", appBundle], { stdio: "inherit" });
    }
    console.log("--done");
  });

  // 两种架构使用独立压缩包名，保留原有 x64 下载路径。
  gulp.task(`${taskName}zip`, done => {
    console.log(`--package ${KICK_NAME}-darwin-${arch}-v${VERSION}.zip`);
    const outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-darwin-${arch}-v${VERSION}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(outputZip);
    archive.directory(`${TARGET}/${NAME}-darwin-${arch}/${NAME}.app`, `${NAME}.app`);
    archive.finalize().then(done);
  });
});

gulp.task("dmg", done => {
  console.log(`--package ${NAME}.dmg`);

  createDMG({
    appPath: `${TARGET}/${NAME}-darwin-x64/${NAME}.app`,
    name: NAME,
    title: `${NAME}, by Qiniu`,
    icon: `${BRAND}/qiniu.icns`,
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
  }).then(() => {
    done();
  });
});

gulp.task("win64", done => {
  console.log(`--package ${NAME}-win32-x64`);
  const targetDir = path.resolve(TARGET, `./${NAME}-win32-x64`);

  plugins.run(`rm -rf ${targetDir}`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "x64";
    options.icon = `${BRAND}/qiniu.png`;

    packager(options).then((paths) => {
      fs.copyFileSync(
        path.resolve(ROOT, `./${WIN_NO_SANDBOX_NAME}`),
        path.resolve(targetDir, `./${WIN_NO_SANDBOX_NAME}`)
      );
      console.log("--done");
      done();
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("win64zip", done => {
  console.log(`--package ${KICK_NAME}-win32-x64-v${VERSION}.zip`);
  const inputDir = `${TARGET}/${NAME}-win32-x64`;
  const outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-win32-x64-v${VERSION}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(inputDir, false);
  archive.finalize().then(done);
});

gulp.task("win32", done => {
  console.log(`--package ${NAME}-win32-ia32`);
  const targetDir = path.resolve(TARGET, `./${NAME}-win32-ia32`);

  plugins.run(`rm -rf ${targetDir}`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "ia32";
    options.icon = `${BRAND}/qiniu.png`;

    packager(options).then((paths) => {
      fs.copyFileSync(
        path.resolve(ROOT, `./${WIN_NO_SANDBOX_NAME}`),
        path.resolve(targetDir, `./${WIN_NO_SANDBOX_NAME}`)
      );
      console.log("--done");
      done();
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("win32zip", done => {
  console.log(`--package ${KICK_NAME}-win32-x86-v${VERSION}.zip`);
  const inputDir = `${TARGET}/${NAME}-win32-ia32`;
  const outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-win32-x86-v${VERSION}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(inputDir, false);
  archive.finalize().then(done);
});

gulp.task("linux64", done => {
  console.log(`--package ${NAME}-linux-x64`);
  const targetDir = `${TARGET}/${NAME}-linux-x64`;

  plugins.run(`rm -rf ${targetDir}`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "x64";

    packager(options).then((paths) => {
      fs.copyFileSync(
        path.resolve(ROOT, `./${LINUX_DESKTOP_FILE}`),
        path.resolve(targetDir, `./${LINUX_DESKTOP_FILE}`)
      );
      console.log("--done");
      done();
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("linux64zip", done => {
  console.log(`--package ${KICK_NAME}-linux-x64-v${VERSION}.zip`);
  const outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-linux-x64-v${VERSION}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(`${TARGET}/${NAME}-linux-x64`, false);
  archive.finalize().then(done);
});

gulp.task("linux32", done => {
  console.log(`--package ${NAME}-linux-ia32`);
  const targetDir = `${TARGET}/${NAME}-linux-ia32`;

  plugins.run(`rm -rf ${targetDir}`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "ia32";

    packager(options).then((paths) => {
      fs.copyFileSync(
        path.resolve(ROOT, `./${LINUX_DESKTOP_FILE}`),
        path.resolve(targetDir, `./${LINUX_DESKTOP_FILE}`)
      );
      console.log("--done");
      done();
    }, (errs) => {
      console.error(errs);
    });
  });
});

gulp.task("linux32zip", done => {
  console.log(`--package ${KICK_NAME}-linux-x86-v${VERSION}.zip`);
  const inputDir = `${TARGET}/${NAME}-linux-ia32`;
  const outputZip = fs.createWriteStream(`${TARGET}/${KICK_NAME}-linux-x86-v${VERSION}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(outputZip);
  archive.directory(inputDir, false);
  archive.finalize().then(done);
});
