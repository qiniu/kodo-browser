
VERSION=2.0.0
NAME=s3-browser
CUSTOM=./custom

GULP=node ./node_modules/gulp/bin/gulp.js
PKGER=node node_modules/electron-packager/cli.js
ZIP=node ../zip.js

ELECTRON_MIRROR=http://npm.taobao.org/mirrors/electron/
ELECTRON_VERSION=1.8.3
BUILD=ELECTRON_MIRROR=$(ELECTRON_MIRROR) $(PKGER) ./dist $(NAME) --overwrite --out=build --electron-version $(ELECTRON_VERSION)


i:
	cnpm i
dev:
	NODE_ENV=development electron .
run:
	custom=$(CUSTOM) npm run dev
clean:
	rm -rf dist node_modules build releases node/s3store/node_modules

prod:
	npm run prod
watch:
	$(GULP) watch --custom=$(CUSTOM)
build:
	$(GULP) build --custom=$(CUSTOM)

win64:
	rm -f ./dist/node/bin/node.bin ./dist/node/bin/node
	cp -f ./node/bin/node.exe ./dist/node/bin/node.exe
	$(BUILD) --platform=win32 --arch=x64 --icon=$(CUSTOM)/icon.ico
	cp -rf $(CUSTOM) build/$(NAME)-win32-x64/resources
	# rm -rf releases/$(VERSION)/$(NAME)-win32-x64.zip && mkdir -p releases/$(VERSION)
	# cd build && $(ZIP) ../releases/$(VERSION)/$(NAME)-win32-x64.zip $(NAME)-win32-x64/
win32:
	rm -f ./dist/node/bin/node.bin ./dist/node/bin/node
	cp -f ./node/bin/node.exe ./dist/node/bin/node.exe
	$(BUILD) --platform=win32 --arch=ia32 --icon=$(CUSTOM)/icon.ico
	cp -rf $(CUSTOM) build/$(NAME)-win32-ia32/resources
	# rm -rf releases/$(VERSION)/$(NAME)-win32-ia32.zip && mkdir -p releases/$(VERSION)
	# cd build && $(ZIP) ../releases/$(VERSION)/$(NAME)-win32-ia32.zip $(NAME)-win32-ia32/
linux64:
	rm -f ./dist/node/bin/node.exe ./dist/node/bin/node
	cp -f ./node/bin/node.bin ./dist/node/bin/node.bin
	$(BUILD) --platform=linux --arch=x64
	cp -rf $(CUSTOM) build/$(NAME)-linux-x64/resources
	# rm -rf releases/$(VERSION)/$(NAME)-linux-x64.zip && mkdir -p releases/$(VERSION)
	# cd build && $(ZIP) ../releases/$(VERSION)/$(NAME)-linux-x64.zip $(NAME)-linux-x64/
linux32:
	rm -f ./dist/node/bin/node.exe ./dist/node/bin/node
	cp -f ./node/bin/node.bin ./dist/node/bin/node.bin
	$(BUILD) --platform=linux --arch=ia32
	cp -rf $(CUSTOM) build/$(NAME)-linux-ia32/resources
	# rm -rf releases/$(VERSION)/$(NAME)-linux-ia32.zip && mkdir -p releases/$(VERSION)
	# cd build && $(ZIP) ../releases/$(VERSION)/$(NAME)-linux-ia32.zip $(NAME)-linux-ia32/
mac:
	rm -rf ./dist/node/bin/node.exe ./dist/node/bin/node.bin
	cp -f ./node/bin/node ./dist/node/bin/node
	$(BUILD) --platform=darwin --arch=x64 --icon=$(CUSTOM)/icon.icns
	cp -rf $(CUSTOM) build/$(NAME)-darwin-x64/$(NAME).app/Contents/Resources
	# rm -rf releases/$(VERSION)/$(NAME)-darwin-x64.zip && mkdir -p releases/$(VERSION)
	# cd build && $(ZIP) ../releases/$(VERSION)/$(NAME)-darwin-x64.zip $(NAME)-darwin-x64/
dmg: mac
	rm build/$(NAME)-darwin-x64/LICENSE* build/$(NAME)-darwin-x64/version || continue
	ln -s /Applications/ build/$(NAME)-darwin-x64/Applications || continue
	cp -f ./dist/icons/icon.icns build/$(NAME)-darwin-x64/.VolumeIcon.icns
	rm -f releases/$(VERSION)/$(NAME).dmg || continue
	hdiutil create -size 250M -format UDZO -srcfolder build/$(NAME)-darwin-x64 -o releases/$(VERSION)/$(NAME).dmg

all:win32 win64 linux32 linux64 mac
	@echo 'Done'

.PHONY:build
