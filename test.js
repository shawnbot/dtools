var dtools = require("./dtools");

var foo = dtools.property("foo"),
    blen = dtools.property("bar.length"),
    data = [
      {foo: 1, bar: "a"},
      {foo: 7, bar: "ab"},
      {foo: 4, bar: "abc"},
      {foo: 6, bar: "abcd"}
    ];

console.log(dtools.flatten([[[[0,1,2,[3,4]]]],[5,6],7]));

console.log("foos:", data.map(foo));

console.log("sorted +foo:", data.sort(dtools.sort("+foo")));
console.log("sorted -foo:", data.sort(dtools.sort("-foo")));

console.log("bar.lengths:", data.map(blen));
console.log("sorted -bar.length:", data.sort(dtools.sort(blen, dtools.descending)));

var summarize = dtools.summarize()
      .props(["foo", "bar"])
      .stats(["min", "max", "mean", "median"]),
    summary = summarize(data);
console.log("summary:", summary);
console.log("average foo:", summary.foo.mean);
console.log("max bar:", summary.bar.max);


console.log("bar summary (copy):", dtools.copy.properties(summary, ["bar.min"]));
