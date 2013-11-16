all: dtools.min.js

dtools.min.js: dtools.js
	uglifyjs $< > $@

test:

clean:
	rm -f dtools.min.js
