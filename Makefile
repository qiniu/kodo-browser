NAME=kodo-browser

PKGER=node node_modules/electron-packager/cli.js
ZIP=node ../zip.js

i:
	yarn install
test:
	yarn test
dev:
	NODE_ENV=development electron .
run:
	yarn dev
clean:
	rm -rf dist node_modules build releases node/s3store/node_modules

prod:
	yarn prod
watch:
	yarn watch
build:
	yarn build

win64: build
	yarn build:win64
	yarn pkg:win64
win32: build
	yarn build:win32
	yarn pkg:win32
linux64: build
	yarn build:linux64
	yarn pkg:linux64
linux32: build
	yarn build:linux32
	yarn pkg:linux32
mac: build
	yarn build:mac
	yarn pkg:mac
macarm: build
	yarn build:macarm
	yarn pkg:macarm
dmg: mac
	yarn build:dmg

all:win32 win64 linux32 linux64 mac
	@echo 'Done'

.PHONY:build i dev run clean prod watch win64 win32 linux64 linux32 mac dmg all
