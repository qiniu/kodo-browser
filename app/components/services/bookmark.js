angular.module("web").factory("Bookmark", [
  "AuthInfo",
  function(AuthInfo) {
    const fs = require("fs"),
          path = require("path"),
          moment = require("moment");

    class Bookmark {
      constructor(fullPath, mode, timestamp) {
        this.fullPath = fullPath;
        this.mode = mode;
        this.timestamp = timestamp || moment().unix();
      }

      isBucketsOrFiles() {
        return this.mode.startsWith('local');
      }

      isExternalPathBookmark() {
        return this.mode.startsWith('external');
      }
    }

    return {
      list: list,
      add: add,
      marked: marked,
      remove: remove,
    };

    function add(fullPath, mode) {
      const bookmarks = list();
      let found = false;
      for (let i = 0; i < bookmarks.length; i++) {
        if (bookmarks[i].fullPath === fullPath &&
            bookmarks[i].mode === mode) {
          bookmarks[i].timestamp = moment().unix();
          found = true;
          break;
        }
      }
      if (!found) {
        bookmarks.push(new Bookmark(fullPath, mode));
      }
      writeBookmarks(bookmarks);
    }

    function marked(fullPath, mode) {
      const bookmarks = list();
      for (let i = 0; i < bookmarks.length; i++) {
        if (bookmarks[i].fullPath === fullPath &&
            bookmarks[i].mode === mode) {
          return true;
        }
      }
      return false;
    }

    function remove(fullPath, mode) {
        const bookmarks = list();
        for (let i = 0; i < bookmarks.length; i++) {
          if (bookmarks[i].fullPath === fullPath &&
              bookmarks[i].mode === mode) {
                bookmarks.splice(i, 1);
                break;
            }
        }
        writeBookmarks(bookmarks);
    }

    function list() {
        const filePath = getFilePath();
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        } catch (err) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        let bookmarks = JSON.parse(data).bookmarks || [];

        bookmarks = bookmarks.map((bookmark) => {
          return new Bookmark(bookmark.fullPath, bookmark.mode, bookmark.timestamp);
        });

        return bookmarks;
      }

    function getFilePath() {
        const folder = Global.config_path;

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const username = AuthInfo.get().id || 'kodo-browser';
        return path.join(folder, `bookmarks_${username}.json`);
    }

    function writeBookmarks(bookmarks) {
        fs.writeFileSync(getFilePath(), JSON.stringify({bookmarks: bookmarks}));
    }
  }
]);
