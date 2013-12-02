browserify ?= ./node_modules/browserify/bin/cmd.js
uglifyjs ?= ./node_modules/uglify-js/bin/uglifyjs

all: dtools.js dtools.min.js

dtools.js: index-browserify.js
	$(browserify) $< > $@

dtools.min.js: dtools.js
	$(uglifyjs) $< > $@

test:

clean:
	rm -f dtools.js
	rm -f dtools.min.js
