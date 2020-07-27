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

.PHONY:reinstall-npm-aesophia-parser
reinstall-npm-aesophia-parser: remove-aesophia-parser-from-package-json
	rm -rf node_modules/aesophia-parser
	npm install --save aesophia-parser


.PHONY:reinstall-local-aesophia-parser
reinstall-local-aesophia-parser: remove-aesophia-parser-from-package-json
	rm -rf node_modules/aesophia-parser
	npm install --save ../../aesophia-parser


.PHONY:remove-aesophia-parser-from-package-json
remove-aesophia-parser-from-package-json:
	sed -i ".original" /aesophia-parser/d package.json


