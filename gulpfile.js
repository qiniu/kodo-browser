const gulp = require("gulp"),
  plugins = require("gulp-load-plugins")({
    lazy: false
  }),
  packager = require('electron-packager'),
  createDMG = require('electron-installer-dmg'),
  archiver = require('archiver'),
  fs = require("fs"),
  path = require("path"),
  pkg = require("./package");

const NAME = 'Kodo Browser';
const KICK_NAME = 'kodo-browser';
const VERSION = pkg.version;
const ELECTRON_VERSION = "4.2.7";
const ROOT = __dirname;
const ICONS = `${ROOT}/app/icons`;
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

let appTasks = {
  "app.js": () => {
    console.log("--rebuilding app.js...");
    gulp
      .src(["!./app/**/*_test.js", "./app/**/*.js"])
      .pipe(plugins.concat("app.js"))
      .pipe(gulp.dest(DIST));
  },
  "app.css": () => {
    console.log("--rebuilding app.css...");
    gulp
      .src("./app/**/*.css")
      .pipe(plugins.concat("app.css"))
      .pipe(gulp.dest(DIST));
  },
  "app.templates": () => {
    console.log("--rebuilding templates.js...");
    gulp
      .src(["!./app/index.html", "./app/**/*.html"])
      .pipe(plugins.angularTemplatecache("templates.js", {
        standalone: true
      }))
      .pipe(gulp.dest(DIST));
  }
};

[ICONS, DIST, TARGET, RELEASE].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

gulp.task("app.js", appTasks["app.js"]);
gulp.task("app.css", appTasks["app.css"]);
gulp.task("templates", appTasks["app.templates"]);

gulp.task("lib.js", () => {
  //concatenate vendor JS files
  let vendors = [
    "./node_modules/jquery/dist/jquery.js",
    "./node_modules/jquery.qrcode/jquery.qrcode.min.js",

    "./node_modules/moment/min/moment-with-locales.js",
    "./node_modules/bootstrap/dist/js/bootstrap.js",
    "./node_modules/bootstrap-table/dist/bootstrap-table.min.js",

    "./node_modules/angular/angular.js",
    "./node_modules/angular-sanitize/angular-sanitize.js",
    "./node_modules/angular-translate/dist/angular-translate.min.js",
    "./node_modules/@uirouter/angularjs/release/angular-ui-router.js",
    "./node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js",
    "./node_modules/angular-bootstrap-contextmenu/contextMenu.js",

    "./node_modules/showdown/dist/showdown.js",
    "./node_modules/clipboard/dist/clipboard.min.js",

    //code mirror
    "./vendor/diff_match_patch.js",
    "./node_modules/angular-ui-codemirror/src/ui-codemirror.js",
    "./node_modules/codemirror/lib/codemirror.js",
    "./node_modules/codemirror/addon/mode/simple.js",
    "./node_modules/codemirror/addon/merge/merge.js",
    "./node_modules/codemirror/mode/meta.js"
  ];

  // code mirror modes
  let modePath = "./node_modules/codemirror/mode/";
  let modes = fs.readdirSync(modePath);
  modes.forEach(function (n) {
    vendors.push(modePath + n + "/*.js");
  });

  gulp
    .src(vendors)
    .pipe(plugins.concat("lib.js"))
    .pipe(gulp.dest(DIST));
});

gulp.task("lib.css", () => {
  //concatenate vendor CSS files
  gulp
    .src([
      "./node_modules/bootstrap/dist/css/bootstrap.css",
      "./node_modules/bootstrap-table/dist/bootstrap-table.min.css",
      "./node_modules/font-awesome/css/font-awesome.css",
      "./node_modules/codemirror/lib/codemirror.css",
      "./node_modules/codemirror/addon/merge/merge.css"
    ])
    .pipe(plugins.concat("lib.css"))
    .pipe(gulp.dest(DIST + "/css"));
});

gulp.task("copy-fonts", () => {
  gulp
    .src([
      "./node_modules/bootstrap/fonts/*",
      "./node_modules/font-awesome/fonts/*"
    ])
    .pipe(gulp.dest(DIST + "/fonts"));
});

gulp.task("copy-icons", () => {
  gulp.src("./app/icons/**").pipe(gulp.dest(DIST + "/icons"));
});

gulp.task("copy-node", () => {
  gulp
    .src(["./node/**/*", "!./node/**/node_modules/**/*"])
    .pipe(gulp.dest(DIST + "/node"));
});

gulp.task("copy-static", () => {
  gulp.src(["./static/**/*"]).pipe(gulp.dest(DIST + "/static"));
});

gulp.task("copy-index", () => {
  gulp
    .src([
      "./app/index.html",
      "./main.js",
      "./server.js",
      "./release-notes.md"
    ])
    .pipe(gulp.dest(DIST));
});

gulp.task("gen-package", () => {
  let pkg = require("./package");

  delete pkg.devDependencies;

  pkg.scripts = {
    start: "electron ."
  };
  pkg.main = "main.js";

  try {
    fs.statSync(DIST);
  } catch (e) {
    fs.mkdirSync(DIST);
  }

  console.log(`--generating ${DIST}/package.json`);
  fs.writeFileSync(DIST + "/package.json", JSON.stringify(pkg, " ", 2));

  plugins.run(`cd ${DIST} && yarn install`).exec(() => {
    console.log("--done");
  });
});

gulp.task("watch", () => {
  gulp.watch([
    DIST + "/**/*.js",
    DIST + "/**/*.css",
    DIST + "/**/*.html",
    "!" + DIST + "/**/node_modules/**/*"
  ], function (event) {
    return gulp.src(event.path).pipe(plugins.connect.reload());
  });

  gulp.watch(["./app/**/*"], function (event) {
    console.log(new Date(), event);

    if (event.path.endsWith(".js") && !event.path.endsWith("_test.js")) {
      appTasks["app.js"]();
    }

    if (event.path.endsWith(".css")) {
      appTasks["app.css"]();
    }

    if (
      event.path.endsWith(".html") &&
      event.path != path.join(__dirname, "app/index.html")
    ) {
      appTasks["app.templates"]();
    }
  });

  gulp.watch(["./app/index.html", "./main.js", "./server.js"], ["copy-index"]);

  gulp.watch(["./static/**"], ["copy-static"]);

  gulp.watch(["./node/**/*", "!./node/**/node_modules/**/*"], ["copy-node"]);
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

gulp.task("build", [
  "app.js",
  "app.css",
  "templates",
  "lib.js",
  "lib.css",
  "copy-node",
  "copy-fonts",
  "copy-icons",
  "copy-static",
  "copy-index",
  "gen-package"
]);

gulp.task("default", ["build", "watch"]);
