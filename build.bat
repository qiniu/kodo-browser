
@echo off

setlocal

set ELECTRON_MIRROR=http://npm.taobao.org/mirrors/electron/

del ./dist/node/bin/node.bin
del ./dist/node/bin/node

XCOPY ./node/bin/node.exe ./dist/node/bin/

./node_modules/.bin/gulp build