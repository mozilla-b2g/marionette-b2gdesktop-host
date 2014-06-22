node_modules: package.json
	npm install

.PHONY: b2g
b2g: node_modules
	./node_modules/.bin/mozilla-download \
		--product b2g \
		--channel tinderbox \
		--branch mozilla-central $@

.PHONY: ci
ci:
	nohup Xvfb :99 &
	DISPLAY=:99 make test

.PHONY: test
test: b2g node_modules
	./node_modules/.bin/mocha
