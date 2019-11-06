VERSION=1.0.4
NAME=kodo-browser

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
	npm run pkg:win64
win32: build
	npm run build:win32
	npm run pkg:win32
linux64: build
	npm run build:linux64
	npm run pkg:linux64
linux32: build
	npm run build:linux32
	npm run pkg:linux32
mac: build
	npm run build:mac
	npm run pkg:mac
dmg: mac
	npm run build:dmg

win64_via_docker:
	rm -rf build/kodo-browser-win64
	mkdir -p build/kodo-browser-win64
	git archive --format=tar.gz -o build/kodo-browser-win64/archive.tar.gz HEAD
	docker build -f docker/build.dockerfile -t kodo-browser-for-windows build/kodo-browser-win64
	rm build/kodo-browser-win64/archive.tar.gz
	docker run --rm -v $$PWD/build/kodo-browser-win64:/kodo-browser/build kodo-browser-for-windows make i win64
win32_via_docker:
	rm -rf build/kodo-browser-win32
	mkdir -p build/kodo-browser-win32
	git archive --format=tar.gz -o build/kodo-browser-win32/archive.tar.gz HEAD
	docker build -f docker/build.dockerfile -t kodo-browser-for-windows build/kodo-browser-win32
	rm build/kodo-browser-win32/archive.tar.gz
	docker run --rm -v $$PWD/build/kodo-browser-win32:/kodo-browser/build kodo-browser-for-windows make i win32
linux64_via_docker:
	rm -rf build/kodo-browser-linux64
	mkdir -p build/kodo-browser-linux64
	git archive --format=tar.gz -o build/kodo-browser-linux64/archive.tar.gz HEAD
	docker build -f docker/build.dockerfile -t kodo-browser-for-linux build/kodo-browser-linux64
	rm build/kodo-browser-linux64/archive.tar.gz
	docker run --rm -v $$PWD/build/kodo-browser-linux64:/kodo-browser/build kodo-browser-for-linux make i linux64

all:win32 win64 linux32 linux64 mac
	@echo 'Done'

.PHONY:build i dev run clean prod watch win64 win32 linux64 linux32 mac dmg all
