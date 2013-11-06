.PHONY: test
test:
	./node_modules/mocha/bin/mocha --ui tdd -t 100s test/index

node_modules: package.json
	npm install

.PHONY: b2g
b2g: node_modules
	./node_modules/.bin/mozilla-download --product b2g $@

.PHONY: ci
ci:
	nohup Xvfb :99 &
	DISPLAY=:99 make test
