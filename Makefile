VERSION=0.1.0-beta
NAME=kodo-browser
CUSTOM=./custom

GULP=node ./node_modules/gulp/bin/gulp.js
PKGER=node node_modules/electron-packager/cli.js
ZIP=node ../zip.js

i:
	yarn install
dev:
	NODE_ENV=development electron .
run:
	npm run dev
clean:
	rm -rf dist node_modules build releases node/s3store/node_modules

prod:
	npm run prod
watch:
	$(GULP) watch
build:
	$(GULP) build

win64: build
	npm run build:win64
	npm run build:msi64
win32: build
	npm run build:win32
	npm run build:msi32
linux64: build
	npm run build:linux64
linux32: build
	npm run build:linux32
mac: build
	npm run build:mac
dmg: mac
	npm run build:dmg

all:win32 win64 linux32 linux64 mac
	@echo 'Done'

.PHONY:build i dev run clean prod watch win64 win32 linux64 linux32 mac dmg all
