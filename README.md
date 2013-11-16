# dtools
JavaScript data tools!

This project leans heavily on [Tom Macwright's](http://macwright.org/)
[simple-statistics](http://macwright.org/simple-statistics/) for statistical
functions, and adds some syntatical sugar to make it possible to do
higher-level analyses of multi-dimensional data sets. Here are the goods:

dtools.**field**(**key**[, **name**])

A *field* function returns the named property of its first argument. **TODO**


dtools.**identity**()

The identity function returns its first argument.

```js
dtools.identity(5)
// 5
```


dtools.**index**()

The index function returns its second argument, which is a convention used in
[d3](http://d3js.org) and most JavaScript Array iteration functions.

```js
[5, 4, 3, 2, 1].map(dtools.index)
// [0, 1, 2, 3]
```
