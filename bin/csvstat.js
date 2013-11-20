#!/usr/bin/env node
var dtools = require("../dtools"),
    fs = require("fs"),
    csv = require("csv"),
    optimist = require("optimist"),
    argv = optimist
      .option("limit", {
        describe: "Limit input to a number of rows (for testing)"
      })
      .option("ugly", {
        alias: "u",
        describe: "Don't pretty-print JSON output",
        default: false,
        boolean: true
      })
      .option("props", {
        alias: "p",
        describe: "A comma-separated list of properties to summarize"
      })
      .option("not-props", {
        alias: "P",
        describe: "A comma-separated list of properties *not* to summarize"
      })
      .option("stats", {
        alias: "s",
        describe: "A comma-separated list of stats to run",
        default: "min, max, uniqueCount, common"
      })
      .option("unique-threshold", {
        alias: "u",
        describe: "Only include columns with this many unique values or more",
        default: -1
      })
      .option("dict", {
        alias: "D",
        describe: "Output per-property summaries as a dictionary, rather than a list",
        boolean: true
      })
      .check(function(argv) {
        if (argv.help) return;

        if (argv["not-props"]) argv.notProps = split(argv["not-props"]);
        else if (argv.props) argv.props = split(argv.props);

        if (argv.stats) argv.stats = split(argv.stats);
        argv.pretty = !argv.ugly;

        if (argv["unique-threshold"] > 0) {
          argv.uniqueThreshold = argv["unique-threshold"];
          if (argv.stats.indexOf("uniqueCount") === -1) {
            argv.stats.push("uniqueCount");
          }
        }
      })
      .argv,
    props = null,
    stats = argv.stats,
    limit = argv.limit,
    pretty = argv.pretty,
    argc = argv._;

if (argv.help) return optimist.showHelp();

var input = (!argc.length || argc[0] === "-")
  ? process.stdin
  : fs.createReadStream(argc[0]);

var columns,
    rows = [];

var stream = csv()
  .from(input)
  .on("error", writeJSON)
  .on("record", read)
  .on("end", done);

function read(row, i) {
  if (columns) {
    var obj = dtools.dict(dtools.zip(columns, row));
    coerce(obj);
    rows.push(obj);
    if (rows.length === limit) {
      console.warn("reached limit of %d rows", limit);
      input.close();
      done();
    }
  } else {
    columns = props = row;
    figureOutProps();
    console.warn("read %d columns:", columns.length, columns.join(", "));
  }
}

function coerce(row) {
  for (var k in row) {
    var v = row[k];
    if (!v.length) continue;
    var num = +v;
    if (!isNaN(num)) row[k] = num;
  }
}

function figureOutProps() {
  if (argv.notProps) {
    var no = argv.notProps;
    props = columns.filter(function(col) {
      return no.indexOf(col) === -1;
    });
  } else if (argv.props) {
    var filter = function(prop) {
      var first = prop.split(/[\[\.]/, 2)[0];
      return columns.indexOf(first) > -1;
    };
    props = Array.isArray(argv.props)
      ? argv.props.filter()
      : dtools.filterKeys(argv.props, filter);
  }
}

function done() {
  if (rows.length === 0) {
    return writeJSON({error: "no rows read"});
  }
  console.warn("done reading; summarizing...");

  var summarize = dtools.summarize();
  if (props) summarize.props(props);
  if (stats) summarize.stats(stats);

  var summary = summarize(rows),
      validProps = summarize.props().map(dtools.name);

  if (argv.uniqueThreshold > 0) {
    var ignoring = [];
    validProps = validProps.filter(function(d) {
      if (summary[d].uniqueCount < argv.uniqueThreshold) {
        ignoring.push(d);
        return false;
      }
      return true;
    });
    if (ignoring.length) {
      console.warn("ignoring %d columns with fewer than %d unique values:", ignoring.length, argv.uniqueThreshold, ignoring.join(", "));
    }
  }

  var propSummaries = validProps.map(function(prop) {
    return [prop, summary[prop]];
  });
  writeJSON({
    rows: rows.length,
    summary: argv.dict
      ? dtools.dict(propSummaries)
      : propSummaries.map(function(d) {
        return {name: d[0], stats: d[1]};
      })
  });
}

function writeJSON(data) {
  console.log(JSON.stringify(data, null, pretty ? 2 : null));
}

function split(str) {
  var parts = str.split(/\s*,\s*/);
  if (str.indexOf("=") > -1) {
    return dtools.dict(parts.map(function(part) {
      return part.split("=", 2);
    }));
  }
  return parts;
}
