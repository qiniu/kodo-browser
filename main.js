const electron = require("electron");
const {
  app,
  Menu,
  ipcMain,
  BrowserWindow
} = electron;
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  fork
} = require("child_process");
const {
  Client
} = require("./node/s3store/lib/ioutil");

app.commandLine.appendSwitch("ignore-connections-limit", "poc.com,s3qos.poc.com,wasuqiniu.cn,s3api.wasuqiniu.cn");

///*****************************************
//静态服务
const PORTS = [7123, 7124, 7125, 7126];

for (var port of PORTS) {
  try {
    //var subp = require('child_process').fork('./server.js',[port]);
    require("./server.js").listen(port);
    console.log("listening on port " + port);
    break;
  } catch (e) {
    console.log("listening on port " + port + ": " + e);
  }
}

///*****************************************
let root = path.dirname(__dirname);

let appRoot = path.dirname(__dirname);
if (process.env.NODE_ENV != "development") {
  appRoot = path.join(appRoot, "app");
}

var custom = {};
try {
  custom = require(path.join(root, "custom"));
} catch (e) {
  console.log("no custom settings");
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let execNode;

switch (process.platform) {
case "darwin":
  app.dock.setIcon(
    custom.logo_png || path.join(root, "icons", "icon.png")
  );

  execNode = path.join(appRoot, "node", "bin", "node");
  break;

case "linux":
  execNode = path.join(appRoot, "node", "bin", "node.bin");
  break;

case "win32":
  execNode = path.join(appRoot, "node", "bin", "node.exe");
  break;
}

function createWindow() {
  var opt = {
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: custom.title || "S3 Browser",
    icon: custom.logo_ico || path.join(__dirname, "icons", "icon.ico")
  };

  if (process.platform == "linux") {
    opt.icon = custom.logo_png || path.join(__dirname, "icons", "icon.png");
  }

  // Create the browser window.   http://electron.atom.io/docs/api/browserwindow/
  win = new BrowserWindow(opt);

  win.setTitle(opt.title);

  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/index.html`);

  win.setMenuBarVisibility(false);

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  if (process.env.NODE_ENV == "development") {
    console.log("run in development");

    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    if (process.platform === "darwin") {
      // Create the Application's main menu
      let template = getMenuTemplate();

      //注册菜单, 打包后可以复制, 但是不能打开 devTools
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  }
}

// listener events send from renderer process
ipcMain.on("asynchronous", (event, data) => {
  switch (data.key) {
  case "getStaticServerPort":
    event.sender.send("asynchronousreply", {
      key: data.key,
      port: port
    });
    break;

  case "openDevTools":
    win.webContents.openDevTools();
    break;

  case "installRestart":
    var version = data.version;
    var from = path.join(path.dirname(__dirname), version + "app.asar");
    var to = path.join(path.dirname(__dirname), "app.asar");

    setTimeout(function () {
      fs.rename(from, to, function (e) {
        if (e) {
          fs.writeFileSync(
            path.join(os.homedir(), ".s3browser", "upgradeerror.txt"),
            JSON.stringify(e)
          );
        } else {
          app.relaunch();
          app.exit(0);
        }
      });
    }, 1000);

    break;
  }
});

ipcMain.on("asynchronous-job", (event, data) => {
  switch (data.key) {
  case "job-upload":
    var execScript = path.join(appRoot, "node", "s3store", "lib", "upload-worker.js");

    event.sender.send(data.job, {
      job: data.job,
      key: 'debug',
      env: {
        node: execNode,
        script: execScript
      }
    });

    var client = new Client(data.options);

    var worker = fork(execScript, [], {
      cwd: root,
      execPath: execNode,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      silent: true
    });
    worker.send({
      key: "start",
      data: data
    });
    worker.on("message", function (msg) {
      if (data.params.isDebug) {
        event.sender.send(data.job, {
          job: data.job,
          key: 'debug',
          message: msg
        });
      }

      switch (msg.key) {
      case 'fileStat':
        event.sender.send(data.job, {
          job: data.job,
          key: 'fileStat',
          data: {
            progressLoaded: 0,
            progressTotal: msg.data.progressTotal
          }
        });

        break;

      case 'progress':
        event.sender.send(data.job, {
          job: data.job,
          key: 'progress',
          data: {
            progressLoaded: msg.data.progressLoaded,
            progressTotal: msg.data.progressTotal
          }
        });

        break;

      case 'fileUploaded':
        event.sender.send(data.job, {
          job: data.job,
          key: 'fileUploaded',
          data: msg.data
        });

        worker.kill();

        break;

      case 'error':
        event.sender.send(data.job, {
          job: data.job,
          key: 'error',
          error: msg.error
        });

        worker.kill();

        break;

      default:
        event.sender.send(data.job, {
          job: data.job,
          key: 'unknown',
          message: msg
        });
      }
    });
    worker.on("exit", function (code, signal) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'debug',
        exit: {
          code: code,
          signal: signal
        }
      });
    });
    worker.on("error", function (err) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'error',
        error: err
      });
    });

    // var client = new Client(data.options);

    // var uploader = client.uploadFile(data.params);
    // uploader.on('fileStat', function (e2) {
    //   event.sender.send(data.job, {
    //     job: data.job,
    //     key: 'fileStat',
    //     data: {
    //       progressLoaded: 0,
    //       progressTotal: e2.progressTotal
    //     }
    //   });
    // });
    // uploader.on('progress', function (e2) {
    //   event.sender.send(data.job, {
    //     job: data.job,
    //     key: 'progress',
    //     data: {
    //       progressLoaded: e2.progressLoaded,
    //       progressTotal: e2.progressTotal
    //     }
    //   });
    // });
    // uploader.on('fileUploaded', function (result) {
    //   event.sender.send(data.job, {
    //     job: data.job,
    //     key: 'fileUploaded',
    //     data: result
    //   });
    // });
    // uploader.on('error', function (err) {
    //   event.sender.send(data.job, {
    //     job: data.job,
    //     key: 'error',
    //     error: err
    //   });
    // });

    break;

  case "job-download":
    var client = new Client(data.options);

    var downloader = client.downloadFile(data.params);
    downloader.on('fileStat', function (e2) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'fileStat',
        data: {
          progressLoaded: 0,
          progressTotal: e2.progressTotal
        }
      });
    });
    downloader.on('progress', function (e2) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'progress',
        data: {
          progressLoaded: e2.progressLoaded,
          progressTotal: e2.progressTotal
        }
      });
    });
    downloader.on('fileDownloaded', function (result) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'fileDownloaded',
        data: result
      });
    });
    downloader.on('error', function (err) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'error',
        error: err
      });
    });

    break;
  }
});

//singleton
const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    }

    win.focus();
  }
});

if (shouldQuit) {
  app.quit();
  process.exit(0);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("windowallclosed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== 'darwin') {
  app.quit();
  //}
});

app.on("activate", () => {
  // On OS X it's common to recreate a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function getMenuTemplate() {
  return [{
      label: "Application",
      submenu: [{
          label: "About Application",
          selector: "orderFrontStandardAboutPanel:"
        },
        {
          type: "separator"
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: function () {
            app.quit();
          }
        }
      ]
    },
    {
      label: "Edit",
      submenu: [{
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          selector: "undo:"
        },
        {
          label: "Redo",
          accelerator: "Shift+CmdOrCtrl+Z",
          selector: "redo:"
        },
        {
          type: "separator"
        },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          selector: "cut:"
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          selector: "copy:"
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          selector: "paste:"
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          selector: "selectAll:"
        }
      ]
    },
    {
      label: "Window",
      submenu: [{
          label: "Minimize",
          accelerator: "CmdOrCtrl+M",
          click: function () {
            win.minimize();
          }
        },
        {
          label: "Close",
          accelerator: "CmdOrCtrl+W",
          click: function () {
            win.close();
          }
        }
      ]
    }
  ];
}