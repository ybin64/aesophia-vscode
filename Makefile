VSCE_BIN ?= ./node_modules/.bin/vsce

.PHONY:build-vsix
build-vsix: clean-build
	rm *.vsix
	$(VSCE_BIN) package

.PHONY:clean-build
clean-build:
	make -C client clean-build
	make -C server clean-build

show-published-files:
	$(VSCE_BIN) ls

.PHONY:deps
deps:
	npm install
	make -C client deps
	make -C server deps

.PHONY:reinstall-local-aesophia-parser
reinstall-local-aesophia-parser:
	# NOTE: The client doesn't use aesophia-parser, just for debugging stuff
	#make -C client reinstall-local-aesophia-parser
	make -C server reinstall-local-aesophia-parser


