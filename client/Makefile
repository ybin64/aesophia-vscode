
.PHONY:build-release
build-release: clean-build
	npm run vscode:prepublish
	rm -f out/*.map

.PHONY:build-dev
build-dev: clean-build
	npm run webpack


.PHONY:clean-build
clean-build:
	rm -rf out

.PHONY:deps
deps:
	npm install


# NOTE: aesophia-parser isn't really used by the client, just to debug som stuff
.PHONY:reinstall-local-aesophia-parser
reinstall-local-aesophia-parser:
	rm -rf node_modules/aesophia-parser
	npm install --save-dev ../../aesophia-parser



