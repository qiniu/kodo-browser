import path from "path";
import {fork, ChildProcess} from "child_process";

import {
  app,
  globalShortcut,
  dialog,
  Menu,
  ipcMain,
  BrowserWindow
} from "electron";
import * as electronRemote from "@electron/remote/main";
import { UplogBuffer } from "kodo-s3-adapter-sdk/dist/uplog";

import {UploadAction, UploadReplyMessage} from "@common/ipc-actions/upload";
import {DownloadAction, DownloadReplyMessage} from "@common/ipc-actions/download";
import {DeepLinkAction} from "@common/ipc-actions/deep-link";

import {deepLinkRegister} from "./deep-links";

//singleton
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}
electronRemote.initialize();
deepLinkRegister.initialize();

///*****************************************
const root = path.dirname(__dirname);
const uiRoot = path.join(root, 'renderer');
const brandRoot = path.join(root, 'renderer', 'static', 'brand')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null;
let winBlockedTid: number; // time interval for close
let forkedWorkers = new Map<string, ChildProcess>();
let uploadRunning = 0;
let downloadRunning = 0;

switch (process.platform) {
case "darwin":
  app.dock.setIcon(
    path.join(brandRoot, "qiniu.png")
  );
  break;
case "linux":
  break;
case "win32":
  break;
}

// Someone tried to run a second instance, we should focus our window.
app.on('second-instance', (_evt, _argv, _cwd) => {
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();
  }
});

let createWindow = () => {
  if (!singleInstanceLock) {
    return;
  }
  let opt = {
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 600,
    title: "Kodo Browser",
    icon: path.join(brandRoot, "qiniu.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };

  function confirmForWorkers(e: Event) {
    const runningJobs = downloadRunning + uploadRunning;

    if (runningJobs <= 0) {
      return;
    }

    // always stop
    if (winBlockedTid) {
      clearInterval(winBlockedTid);
    }

    function confirmCb (btn: number) {
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

          clearInterval(winBlockedTid);
          winBlockedTid = setInterval(() => {
            if (runningJobs > 0) {
              return;
            }

            clearInterval(winBlockedTid);

            win?.close();
          }, 3000) as unknown as number; // hack type problem

          break;

        default:
          // cancel close
          e.preventDefault();
      }
    }

    let btns = ["Force Quit", "Cancel", "Waiting for jobs"];
    if (process.platform == "darwin") {
      btns = btns.reverse();
    }

    // prevent if there still alive workers.
    confirmCb(dialog.showMessageBoxSync({
      type: "warning",
      message: `There ${runningJobs > 1 ? "are" : "is"} still ${runningJobs} ${runningJobs > 1 ? "jobs" : "job"} in processing, are you sure to quit?`,
      buttons: btns
    }));
  }

  if (process.platform == "linux") {
    opt.icon = path.join(brandRoot, "qiniu.png");
  }

  // Create the browser window.   http://electron.atom.io/docs/api/browserwindow/
  win = new BrowserWindow(opt);
  win.setTitle(opt.title);
  win.setMenuBarVisibility(false);
  electronRemote.enable(win.webContents);

  let focused = true, shown = true;

  const registerOrUnregisterShortcutForDevTools = () => {
    if (process.env.NODE_ENV != "development") {
      const shortcut = 'CommandOrControl+Alt+I';
      if (shown && focused) {
        if (!globalShortcut.isRegistered(shortcut)) {
          globalShortcut.register(shortcut, () => {
            win?.webContents.toggleDevTools();
          });
        }
      } else {
        if (globalShortcut.isRegistered(shortcut)) {
          globalShortcut.unregister(shortcut);
        }
      }
    }
  };

  win.on("blur", function() {
    focused = false;
    registerOrUnregisterShortcutForDevTools();
  });
  win.on("focus", function() {
    focused = true;
    registerOrUnregisterShortcutForDevTools();
  });
  win.on("show", function() {
    shown = true;
    registerOrUnregisterShortcutForDevTools();
  });
  win.on("hide", function() {
    shown = false;
    registerOrUnregisterShortcutForDevTools();
  });
  win.on("close", confirmForWorkers);

  // Emitted when the window is closed.
  win.on("closed", () => {
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
  win.loadURL(`file://${uiRoot}/index.html`);

  if (process.env.NODE_ENV == "development") {
    console.log("run in development");

    // Open the DevTools.
    win.webContents.openDevTools();
  } else if (process.platform === "darwin") {
    console.log("run on macos in production");
    // Create the Application's main menu
    setMenu();
  }
};

///*****************************************
// listener events send from renderer process
ipcMain.on("UploaderManager", (event, message) => {
  const processName = "UploaderProcess";
  let uploaderProcess = forkedWorkers.get(processName);
  if (!uploaderProcess) {
    uploaderProcess = fork(
        path.join(root, "main", "uploader-bundle.js"),
        // is there a better way to pass parameters?
        ['--config-json', JSON.stringify({
          maxConcurrency: 5,
          // ...
        })],
        {
          cwd: root,
          silent: false,
          execArgv: process.env.NODE_ENV === "development"
            ? ["--inspect=9222"]
            : [],
        },
    );
    forkedWorkers.set(processName, uploaderProcess);

    uploaderProcess.on("exit", () => {
      forkedWorkers.delete(processName)
    });

    uploaderProcess.on("message", (message: UploadReplyMessage) => {
      if (win && !win.isDestroyed()) {
        event.sender.send("UploaderManager-reply", message);
      }
      switch (message.action) {
        case UploadAction.UpdateUiData: {
          uploadRunning = message.data.running;
          break;
        }
      }
    });
  }

  uploaderProcess.send(message);
});

ipcMain.on("DownloaderManager", (event, message) => {
  const processName = "DownloaderProcess";
  let downloaderProcess = forkedWorkers.get(processName);
  if (!downloaderProcess) {
    downloaderProcess = fork(
        path.join(root, "main", "downloader-bundle.js"),
        // is there a better way to pass parameters?
        ['--config-json', JSON.stringify({
          maxConcurrency: 5,
        })],
        {
          cwd: root,
          silent: false,
          execArgv: process.env.NODE_ENV === "development"
            ? ["--inspect=9223"]
            : [],
        },
    );
    forkedWorkers.set(processName, downloaderProcess);

    downloaderProcess.on("exit", () => {
      forkedWorkers.delete(processName)
    });

    downloaderProcess.on("message", (message: DownloadReplyMessage) => {
      if (win && !win.isDestroyed()) {
        event.sender.send("DownloaderManager-reply", message);
      }
      switch (message.action) {
        case DownloadAction.UpdateUiData: {
          downloadRunning = message.data.running;
          break;
        }
      }
    });
  }

  downloaderProcess.send(message);
});

ipcMain.on("asynchronous", (_event, data) => {
  switch (data.key) {
  case "openDevTools":
    win?.webContents.openDevTools();
    break;

  case "reloadWindow":
    win?.webContents.reload();
    break;

  case "signOut":
    win?.webContents.session.clearCache()
      .then(() => {
        console.info('cache cleared');
      });
    forkedWorkers.forEach((worker) => {
      worker.kill();
    });
    break;
  }
});

const DEEP_LINK_IPC_CHANNEL = "DeepLink";

ipcMain.on(DEEP_LINK_IPC_CHANNEL, (event, data) => {
  switch (data.action) {
    case DeepLinkAction.RendererReady:
      deepLinkRegister.enable(event.sender, DEEP_LINK_IPC_CHANNEL);
      break;
    case DeepLinkAction.RendererClose:
      deepLinkRegister.disable();
      break;
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // prevent Uplog always locked
  // due to forcing quiting app when locked
  UplogBuffer.forceUnlock()
      .catch(err => {
        console.warn("unlock file failed:", err);
      });
  createWindow();
});

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

process.on("exit", () => {
  app.releaseSingleInstanceLock();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function setMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "Application",
      submenu: [{
        label: "About Application",
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
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          role: "undo"
        },
        {
          label: "Redo",
          accelerator: "Shift+CmdOrCtrl+Z",
          role: "redo",
        },
        {
          type: "separator"
        },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectAll",
        }
      ]
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "CmdOrCtrl+M",
          click: function () {
            win?.minimize();
          }
        },
        {
          label: "Close",
          accelerator: "CmdOrCtrl+W",
          click: function () {
            win?.close();
          }
        }
      ]
    }
  ]));
}
