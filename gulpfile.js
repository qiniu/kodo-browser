let gulp = require("gulp"),
  plugins = require("gulp-load-plugins")({
    lazy: false
  }),
  packager = require('electron-packager'),
  os = require("os"),
  fs = require("fs"),
  path = require("path"),
  pkg = require("./package");

let NAME = pkg.name;
let VERSION = pkg.version;
let ELECTRON_MIRROR = "http://npm.taobao.org/mirrors/electron/";
let ELECTRON_VERSION = "1.8.3";
let ROOT = __dirname;
let CUSTOM = `${ROOT}/custom`;
let DIST = `${ROOT}/dist`;
let TARGET = `${ROOT}/build`;
let RELEASE = `${ROOT}/release`;

let packagerOptions = {
  dir: DIST,
  name: NAME,
  asar: false,
  out: TARGET,
  overwrite: true,
  appVersion: VERSION,
  appCopyright: "",
  electronVersion: ELECTRON_VERSION,
  packageManager: "yarn",
  extraResource: [
    `${CUSTOM}`
  ]
};

require("shelljs/global");

let appTasks = {
  appJS: () => {
    console.log("--rebuilding app.js...");
    gulp
      .src(["!./app/**/*_test.js", "./app/**/*.js"])
      .pipe(
        plugins.babel({
          presets: ["env"]
        })
      )
      .pipe(plugins.concat("app.js"))
      .pipe(gulp.dest(DIST))
      .on("end", () => {
        console.log("--done");
      });
  },

  appCSS: () => {
    console.log("--rebuilding lib.css...");
    gulp
      .src("./app/**/*.css")
      .pipe(plugins.concat("app.css"))
      .pipe(gulp.dest(DIST))
      .on("end", () => {
        console.log("--done");
      });
  },

  templates: () => {
    console.log("--rebuilding templates.js...");
    gulp
      .src(["!./app/index.html", "./app/**/*.html"])
      .pipe(plugins.angularTemplatecache("templates.js", {
        standalone: true
      }))
      .pipe(gulp.dest(DIST))
      .on("end", () => {
        console.log("--done");
      });
  }
};

gulp.task("js", appTasks.appJS);
gulp.task("css", appTasks.appCSS);
gulp.task("templates", appTasks.templates);

gulp.task("libJS", () => {
  //concatenate vendor JS files
  let vendors = [
    "./node_modules/jquery/dist/jquery.js",
    "./node_modules/jquery.qrcode/jquery.qrcode.min.js",

    "./node_modules/moment/min/moment-with-locales.js",
    "./node_modules/bootstrap/dist/js/bootstrap.js",

    "./node_modules/angular/angular.js",
    "./node_modules/angular-sanitize/angular-sanitize.js",
    "./node_modules/angular-translate/dist/angular-translate.min.js",
    "./node_modules/angular-ui-router/release/angular-ui-router.js",
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

gulp.task("libCSS", () => {
  //concatenate vendor CSS files
  gulp
    .src([
      "./node_modules/bootstrap/dist/css/bootstrap.css",
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
  pkg.license = "UNLICENSED";

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
      appTasks.appJS();
    }

    if (event.path.endsWith(".css")) {
      appTasks.appCSS();
    }

    if (
      event.path.endsWith(".html") &&
      event.path != path.join(__dirname, "app/index.html")
    ) {
      appTasks.templates();
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
    options.icon = `${CUSTOM}/icon.icns`;

    packager(options, (errs, paths) => {
      if (errs && errs.length > 0) {
        console.error(`--package  ${NAME}-darwin-x64: ${errs}`);
        return;
      }

      plugins.run(`rm -rf ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.exe ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.bin`).exec(() => {
        console.log("--done");
      });
    });
  });
});

gulp.task("dmg", ["mac"], () => {
  console.log(`--package ${NAME}.dmg`);

  plugins.run(`rm -f ${RELEASE}/${VERSION}/${NAME}.dmg`).exec(() => {
    plugins.run(`rm ${TARGET}/${NAME}-darwin-x64/LICENSE* ${TARGET}/${NAME}-darwin-x64/version`).exec(() => {
      plugins.run(`ln -s /Applications/ ${TARGET}/${NAME}-darwin-x64/Applications`).exec(() => {
        plugins.run(`cp -f ${DIST}/icons/icon.icns ${TARGET}/${NAME}-darwin-x64/.VolumeIcon.icns`).exec(() => {
          plugins.run(`hdiutil create -size 250M -format UDZO -srcfolder ${TARGET}/$(NAME)-darwin-x64 -o ${RELEASE}/${VERSION}/${NAME}.dmg`).exec(() => {
            console.log("--done");
          });
        });
      });
    });
  });
});

gulp.task("win64", () => {
  console.log(`--package ${NAME}-win32-x64`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-win32-x64`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "x64";
    options.icon = `${CUSTOM}/icon.ico`;

    packager(options, (errs, paths) => {
      if (errs && errs.length > 0) {
        console.error(`--package  ${NAME}-win32-x64: ${errs}`);
        return;
      }

      plugins.run(`rm -rf ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.bin`).exec(() => {
        console.log("--done");
      });
    });
  });
});

gulp.task("win32", () => {
  console.log(`--package ${NAME}-win32-ia32`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-win32-ia32`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "win32";
    options.arch = "ia32";
    options.icon = `${CUSTOM}/icon.ico`;

    packager(options, (errs, paths) => {
      if (errs && errs.length > 0) {
        console.error(`--package  ${NAME}-win32-ia32: ${errs}`);
        return;
      }

      plugins.run(`rm -rf ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.bin`).exec(() => {
        console.log("--done");
      });
    });
  });
});

gulp.task("linux64", () => {
  console.log(`--package ${NAME}-linux-x64`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-linux-x64`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "x64";

    packager(options, (errs, paths) => {
      if (errs && errs.length > 0) {
        console.error(`--package  ${NAME}-linux-x64: ${errs}`);
        return;
      }

      plugins.run(`rm -rf ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.exe`).exec(() => {
        console.log("--done");
      });
    });
  });
});

gulp.task("linux32", () => {
  console.log(`--package ${NAME}-linux-ia32`);

  plugins.run(`rm -rf ${TARGET}/${NAME}-linux-ia32`).exec(() => {
    let options = Object.assign({}, packagerOptions);
    options.platform = "linux";
    options.arch = "ia32";

    packager(options, (errs, paths) => {
      if (errs && errs.length > 0) {
        console.error(`--package  ${NAME}-linux-ia32: ${errs}`);
        return;
      }

      plugins.run(`rm -rf ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node ${paths[0]}/${NAME}.app/Contents/Resources/app/node/bin/node.exe`).exec(() => {
        console.log("--done");
      });
    });
  });
});

gulp.task("build", [
  "js",
  "css",
  "templates",
  "libJS",
  "libCSS",
  "copy-node",
  "copy-fonts",
  "copy-icons",
  "copy-static",
  "copy-index",
  "gen-package"
]);

gulp.task("default", ["build", "watch"]);