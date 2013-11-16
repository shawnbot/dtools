# dtools
JavaScript data tools!

This project leans heavily on [Tom Macwright's](http://macwright.org/)
[simple-statistics](http://macwright.org/simple-statistics/) for statistical
functions, and adds some syntatical sugar to make it possible to do
higher-level analyses of multi-dimensional data sets. Here are the goods:

<a href="#field" name="field">#</a> dtools.**field**(*key*[, *name*])

A *field* function returns the named property of its first argument. **TODO**


<a href="#summarize" name="summarize">#</a> dtools.**summarize**()

Creates a new summary function that returns statistics about an array of
values. Summaries can be configured with the following methods:

<a href="#summary-fields" name="summary-fields">#</a> summary.**fields**(*fields*)

Configure the summary to generate keys for the provided keys. Keys can be
provided in any form compatible with [dtools.field](#field). So:

```js
var summarize = dtools.summarize()
  .fields(["foo"])
  .stats(["min"]);
summarize([{foo: 1}, {foo: 2}]);
// {foo: {min: 1}}
```


<a href="#_summarize" name="_summarize">#</a> **summarize**(*array*)

Generate a summary from an array of values. **TODO**

<a href="#identity" name="identity">#</a> dtools.**identity**()

The identity function returns its first argument.

```js
dtools.identity(5)
// 5
```


<a href="#_index" name="_index">#</a> dtools.**index**()

The index function returns its second argument, which is a convention used in
[d3](http://d3js.org) and most JavaScript Array iteration functions.

```js
[5, 4, 3, 2, 1].map(dtools.index)
// [0, 1, 2, 3]
```
