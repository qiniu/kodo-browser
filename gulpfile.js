var gulp = require("gulp"),
  run = require("gulp-run"),
  plugins = require("gulp-load-plugins")({
    lazy: false
  }),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  minimist = require("minimist");

var DIST = "./dist";

require("shelljs/global");

function getCustomPath() {
  var knownOptions = {
    string: "custom",
    default: {
      custom: "./custom"
    }
  };

  var options = minimist(process.argv.slice(2), knownOptions);

  if (options && options.custom) {
    var customPath = path.join(options.custom, "**/*");

    if (customPath.indexOf("~") == 0) {
      customPath = path.join(os.homedir(), customPath, "**/*");
    } else if (customPath.indexOf(".") == 0) {
      customPath = path.join(__dirname, customPath, "**/*");
    }
  }

  return customPath || "custom/**/*";
}

//var VERSION = pkg.version;
var appTasks = {
  appJS: function () {
    console.log("--rebuilding app.js...");
    //combine all js files of the app
    gulp
      .src(["!./app/**/*_test.js", "./app/**/*.js"])
      //.pipe(plugins.jshint())
      //.pipe(plugins.jshint.reporter('default'))
      .pipe(
        plugins.babel({
          presets: ["es2015"]
        })
      )
      .pipe(plugins.concat("app.js"))
      .pipe(gulp.dest(DIST))
      .on("end", function () {
        console.log("--done");
      });
  },
  appCSS: function () {
    console.log("--rebuilding lib.css...");
    gulp
      .src("./app/**/*.css")
      .pipe(plugins.concat("app.css"))
      .pipe(gulp.dest(DIST))
      .on("end", function () {
        console.log("--done");
      });
  },
  templates: function () {
    console.log("--rebuilding templates.js...");
    //combine all template files of the app into a js file
    gulp
      .src(["!./app/index.html", "./app/**/*.html"])
      .pipe(plugins.angularTemplatecache("templates.js", {
        standalone: true
      }))
      .pipe(gulp.dest(DIST))
      .on("end", function () {
        console.log("--done");
      });
  }
};

gulp.task("js", appTasks.appJS);
gulp.task("css", appTasks.appCSS);
gulp.task("templates", appTasks.templates);

gulp.task("libJS", function () {
  //concatenate vendor JS files

  var vendors = [
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
  var modePath = "./node_modules/codemirror/mode/";
  var modes = fs.readdirSync(modePath);
  modes.forEach(function (n) {
    vendors.push(modePath + n + "/*.js");
  });

  gulp
    .src(vendors)
    .pipe(plugins.concat("lib.js"))
    .pipe(gulp.dest(DIST));
});

gulp.task("libCSS", function () {
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

gulp.task("copy-fonts", function () {
  gulp
    .src([
      "./node_modules/bootstrap/fonts/*",
      "./node_modules/font-awesome/fonts/*"
    ])
    .pipe(gulp.dest(DIST + "/fonts"));
});

gulp.task("copy-icons", function () {
  gulp.src("./app/icons/**").pipe(gulp.dest(DIST + "/icons"));
});

gulp.task("copy-node", function () {
  gulp
    .src(["./node/**/*", "!./node/**/node_modules/**/*"])
    .pipe(gulp.dest(DIST + "/node"));
});

gulp.task("copy-docs", function () {
  gulp.src(["./release-notes/**/*"]).pipe(gulp.dest(DIST + "/release-notes"));
});

gulp.task("copy-static", function () {
  gulp.src(["./static/**/*"]).pipe(gulp.dest(DIST + "/static"));
});

gulp.task("copy-index", function () {
  gulp
    .src([
      "./app/index.html",
      "./main.js",
      "./server.js",
      "./vendor/*.js",
      "./release-notes.md"
    ])
    .pipe(gulp.dest(DIST));
});

gulp.task("gen-package", function () {
  var pkg = require("./package");

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

  run(`cd ${DIST} && cnpm i`).exec(function () {
    console.log("--done");
  });
});

gulp.task("watch", function () {
  gulp.watch(
    [
      "!" + DIST + "/**/node_modules/**/*",
      DIST + "/**/*.html",
      DIST + "/**/*.js",
      DIST + "/**/*.css"
    ],
    function (event) {
      return gulp.src(event.path).pipe(plugins.connect.reload());
    }
  );

  gulp.watch(["app/**/*"], function (event) {
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

  gulp.watch(["./app/index.html", "./main.js"], ["copy-index"]);

  gulp.watch(["./static/**"], ["copy-static"]);

  gulp.watch(["./node/**/*", "!./node/**/node_modules/**/*"], ["copy-node"]);
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
  "copy-docs",
  "copy-index",
  "gen-package"
]);

gulp.task("default", ["build", "watch"]);