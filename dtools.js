(function() {

  var dtools = {
    version: "0.0.1"
  };

  if (typeof module === "object") {
    module.exports = dtools;
    var Properly = require("properly"),
        ss = require("simple-statistics");
  } else {
    this.dtools = dtools;
    if (typeof ss !== "object") {
      console.error("[dtools] no simple-statistics! sorry.");
      return;
    }
    if (typeof Properly !== "function") {
      console.warn("[dtools] no Properly found; you won't be able to use nested fields");
      Properly = function(k) {
        return function(d) {
          return d[k];
        };
      };
    }
  }

  dtools.identity = function identity(d) {
    return d;
  };

  dtools.index = function index(d, i) {
    return i;
  };

  // field generator
  dtools.field = function field(key, name) {
    if (typeof key === "function") {
      return dtools.rename(key, name);
    } else {
      var get = Properly(key);
      return dtools.rename(get, name || key);
    }
  };

  // sort comparator by field
  dtools.sort = function sort(key) {
    var order = dtools.ascending;
    switch (typeof key) {
      case "function":
        break;

      case "string":
        var modifier = key.charAt(0);
        if (modifier in dtools.sort.modifiers) {
          var o = dtools.sort.modifiers[modifier];
          order = dtools.sort[o];
          key = key.substr(1);
        }
    }
    var field = dtools.field(key);
    return function(a, b) {
      return order(field(a), field(b));
    };
  };

  // sort by multiple keys
  dtools.sort.multi = function sortMulti() {
    var sorts = [].slice.call(arguments).map(dtools.sort),
        len = sorts.length;
    return function(a, b) {
      var order = 0;
      for (var i = 0; i < len; i++) {
        order = sorts[i](a, b);
        if (order != 0) break;
      }
      return order;
    };
  };

  // ascending comparator
  dtools.ascending = dtools.sort.ascending = function ascending(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  };

  dtools.descending = dtools.sort.descending = function descending(a, b) {
    return a > b ? -1 : a < b ? 1 : 0;
  };

  // faster ascending and descending comparators for numbers
  dtools.sort.ascendingNumeric = function ascendingNumeric(a, b) {
    return a - b;
  };

  dtools.sort.descendingNumeric = function descendingNumeric(a, b) {
    return b - a;
  };

  dtools.sort.modifiers = {
    "-": "ascending",
    "+": "descending",
    ">": "ascendingNumeric",
    "<": "descendingNumeric"
  };

  dtools.name = function(d) {
    return d.__name__ || d.name;
  };

  dtools.rename = function(d, name) {
    if (name) d.__name__ = name;
    return d;
  };

  dtools.values = function values(d) {
    return d;
  };

  dtools.length = function length(d) {
    return d.length;
  };

  for (var key in ss) {
    dtools[key] = dtools.rename(ss[key], key);
  }

  // extent: [min, max]
  dtools.extent = function extent(d) {
    var sorted = d.slice().sort(dtools.ascending);
    return [sorted[0], sorted[sorted.length - 1]];
  };

  // summarizing constructor
  dtools.summarize = function() {
    var fields = [],
        stats = [],
        summarize = function(data) {
          var summary = {};
          fields.forEach(function(field) {
            var fk = dtools.name(field),
                sum = summary[fk] = {},
                values = data.map(field);
            if (!fk) console.warn("no name for field:", field);
            stats.forEach(function(stat) {
              var sk = dtools.name(stat);
              if (!sk) console.warn("no name for stat:", stat);
              sum[sk] = stat(values);
            });
          });
          return summary;
        };

    summarize.fields = function(list) {
      if (!arguments.length) return fields;
      fields = list.map(function(field) {
        return dtools.field(field);
      });
      return summarize;
    };

    summarize.stats = function(list) {
      if (!arguments.length) return stats;
      if (Array.isArray(list)) {
        stats = list.map(function(stat) {
          return dtools.stat(stat);
        });
      } else if (typeof list === "object") {
        stats = Object.keys(list)
          .map(function(key) {
            var stat = list[key];
            return dtools.rename(dtools.stat(list[key]), key);
          });
      }
      return summarize;
    };

    return summarize;
  };

  // coerce a stat name into a stat function or field
  dtools.stat = function(stat, name) {
    switch (typeof stat) {
      case "function":
        break;
      case "number":
      case "string":
        stat = (stat in dtools)
          ? dtools[stat]  // dtools.min
          : dtools.field(stat); // "length", 1
        break;
      default:
        throw "Unrecognized statistic type: " + stat;
    }
    return dtools.rename(stat, name);
  };

})(this);