const electron = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  app,
  dialog,
  Menu,
  ipcMain,
  BrowserWindow
} = electron;
const {
  fork
} = require("child_process");
const {
  Client
} = require("./node/s3store/lib/ioutil");

app.commandLine.appendSwitch("ignore-connections-limit", "poc.com,s3qos.poc.com");

///*****************************************
let root = path.dirname(__dirname);

let appRoot = path.dirname(__dirname);
if (process.env.NODE_ENV != "development") {
  appRoot = path.join(appRoot, "app");
}

let homeRoot = app.getPath("home") || os.homedir();

let custom = {};
try {
  custom = require(path.join(root, "custom"));
} catch (e) {
  console.log("no custom settings");
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let winBlockedTid; // time interval for close
let execNode;
let forkedWorkers = new Map();

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
}

let createWindow = () => {
  let opt = {
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: custom.title || "S3 Browser",
    icon: custom.logo_ico || path.join(root, "icons", "icon.ico")
  };

  let confirmForWorkers = (e) => {
    if (forkedWorkers.size <= 0) {
      return;
    }

    // always stop 
    if (winBlockedTid) {
      clearInterval(winBlockedTid);
    }

    let confirmCb = (btn) => {
      if (process.platform == "darwin") {
        switch (btn) {
        case 0:
          btn = 2;
          break;

        case 1:
          // ignore
          break;

        case 2:
          btn = 0;
          break;

        default:
          btn = 1;
        }
      }

      switch (btn) {
      case 0:
        forkedWorkers.forEach((worker) => {
          worker.kill();
        });

        forkedWorkers = new Map();

        break;

      case 1:
        // cancel close
        e.preventDefault();

        break;

      case 2:
        // cancel close
        e.preventDefault();

        winBlockedTid = setInterval(() => {
          if (forkedWorkers.size > 0) {
            return;
          }

          clearInterval(winBlockedTid);

          win.close();
        }, 3000);

        break;

      default:
        // cancel close
        e.preventDefault();
      }
    };

    let btns = ["Force Quit", "Cancel", "Waiting for jobs"];
    if (process.platform == "darwin") {
      btns = btns.reverse();
    }

    // prevent if there still alive workers.
    confirmCb(dialog.showMessageBox({
      type: "warning",
      message: `There still ${forkedWorkers.size} ${forkedWorkers.size > 1 ? "jobs" : "job"} in processing, are you sure to quit?`,
      buttons: btns
    }));
  };

  if (process.platform == "linux") {
    opt.icon = custom.logo_png || path.join(root, "icons", "icon.png");
  }

  // Create the browser window.   http://electron.atom.io/docs/api/browserwindow/
  win = new BrowserWindow(opt);
  win.setTitle(opt.title);
  win.setMenuBarVisibility(false);

  // Emitted before window reload
  win.on("beforeunload", confirmForWorkers);
  win.on("close", confirmForWorkers);

  // Emitted when the window is closed.
  win.on("closed", (e) => {
    if (forkedWorkers.size > 0) {
      // force cleanup forked workers
      forkedWorkers.forEach((worker) => {
        worker.kill();
      });

      forkedWorkers = new Map();
    }

    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  // load the index.html of the app.
  win.loadURL(`file://${__dirname}/index.html`);

  if (process.env.NODE_ENV == "development") {
    console.log("run in development");

    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    if (process.platform === "darwin") {
      // Create the Application's main menu
      let template = getMenuTemplate();

      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  }
};

///*****************************************
// listener events send from renderer process
ipcMain.on("asynchronous", (event, data) => {
  switch (data.key) {
  case "getStaticServerPort":
    event.sender.send("asynchronous-reply", {
      key: data.key,
      port: serverPort
    });
    break;

  case "openDevTools":
    win.webContents.openDevTools();
    break;

  case "installRestart":
    let version = data.version;
    let from = path.join(path.dirname(__dirname), version + "app.asar");
    let to = path.join(path.dirname(__dirname), "app");

    setTimeout(() => {
      fs.rename(from, to, (e) => {
        if (e) {
          fs.writeFileSync(
            path.join(homeRoot, ".s3-browser", "upgrade-error.txt"),
            JSON.stringify(e)
          );
        } else {
          app.relaunch();
          app.exit(0);
        }
      });
    }, 800);

    break;
  }
});

ipcMain.on("asynchronous-job", (event, data) => {
  switch (data.key) {
  case "job-upload":
    var forkOptions = {
      cwd: root,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      silent: true
    };
    if (data.params.useElectronNode != true) {
      forkOptions.execPath = execNode;
    }

    var execScript = path.join(appRoot, "node", "s3store", "lib", "upload-worker.js");

    if (data.params.isDebug) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'debug',
        env: {
          fork: forkOptions,
          script: execScript
        }
      });
    }

    var worker = fork(execScript, [], forkOptions);
    forkedWorkers.set(data.job, worker);

    worker.send({
      key: "start",
      data: data
    });

    worker.on("message", function (msg) {
      if (!win) return;

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
        forkedWorkers.delete(data.job);

        break;

      case 'error':
        event.sender.send(data.job, {
          job: data.job,
          key: 'error',
          error: msg.error
        });

        worker.kill();
        forkedWorkers.delete(data.job);

        break;

      case 'env':
        // ignore
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
      forkedWorkers.delete(data.job);

      if (!win) return;

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
      forkedWorkers.delete(data.job);

      if (!win) return;

      event.sender.send(data.job, {
        job: data.job,
        key: 'error',
        error: err
      });
    });

    break;

  case "job-download":
    var forkOptions = {
      cwd: root,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      silent: true
    };
    if (data.params.useElectronNode != true) {
      forkOptions.execPath = execNode;
    }

    var execScript = path.join(appRoot, "node", "s3store", "lib", "download-worker.js");

    if (data.params.isDebug) {
      event.sender.send(data.job, {
        job: data.job,
        key: 'debug',
        env: {
          fork: forkOptions,
          script: execScript
        }
      });
    }

    var worker = fork(execScript, [], forkOptions);
    forkedWorkers.set(data.job, worker);

    worker.send({
      key: "start",
      data: data
    });

    worker.on("message", function (msg) {
      if (!win) return;

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

      case 'fileDownloaded':
        event.sender.send(data.job, {
          job: data.job,
          key: 'fileDownloaded',
          data: msg.data
        });

        worker.kill();
        forkedWorkers.delete(data.job);

        break;

      case 'error':
        event.sender.send(data.job, {
          job: data.job,
          key: 'error',
          error: msg.error
        });

        worker.kill();
        forkedWorkers.delete(data.job);

        break;

      case 'env':
        // ignore
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
      forkedWorkers.delete(data.job);

      if (!win) return;

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
      forkedWorkers.delete(data.job);

      if (!win) return;

      event.sender.send(data.job, {
        job: data.job,
        key: 'error',
        error: err
      });
    });

    break;

  case "job-stop":
    var worker = forkedWorkers.get(data.job);
    if (worker) {
      worker.send({
        key: "stop"
      });
    }

    break;

  default:
    event.sender.send(data.job, {
      job: data.job,
      key: 'unknown',
      data: data
    });
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("activate", () => {
  // On OS X it's common to recreate a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== 'darwin') {
  app.quit();
  //}
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