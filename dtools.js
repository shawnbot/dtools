(function() {

  var dtools = {
    version: "0.1.1"
  };

  // TODO: use browserify to build the browser bundle?
  if (typeof module === "object") {
    module.exports = dtools;
    var ss = require("simple-statistics");
  } else {
    this.dtools = dtools;
    if (typeof ss !== "object") {
      console.error("[dtools] no simple-statistics! sorry.");
      return;
    }
  }

  /*
   * the naming interface provides the ability to give custom names to
   * functions so that other dtools functions can infer the names of property
   * getters and statistical functions.
   *
   * dtools.name(fn)
   * returns either the custom or given name of a function
   *
   * dtools.rename(fn, name)
   * gives a custom name to a function
   *
   * dtools.alias(fn, name)
   * returns a new function that calls the given function, and gives the outer
   * function a new name (so as not to overwrite the custom name of the inner
   * function.
   */
  dtools.name = function(d) {
    return d.__name__ || d.name;
  };

  dtools.rename = function(d, name) {
    if (name) d.__name__ = name;
    return d;
  };

  dtools.alias = function(fn, name) {
    return dtools.rename(function aliased() {
      return fn.apply(this, arguments);
    }, name);
  };

  /*
   * object creation and manipulation:
   *
   * dtools.extend(obj [, obj2 [, obj3 ...]])
   * extend `obj` with the keys of each object in the other arguments.
   *
   * dtools.copy(obj [, deep])
   * copy `obj` by extending an empty object with its keys, optionally
   * deep-copying the keys of nested objects.
   *
   * dtools.copy.keys(obj, keys [, deep])
   * copy only the named `keys` (not properties) from `obj` to a new object,
   * optionally deep-copying nested objects.
   *
   * dtools.copy.properties(obj, properties [, deep])
   * copy only the named `properties` (keys or accessor expressions) from `obj`
   * to a new object, optionally deep-copying nested objects.
   */
  dtools.extend = function extend(obj) {
    for (var i = 1, len = arguments.length; i < len; i++) {
      var o = arguments[i];
      if (!o) continue;
      for (var k in o) obj[k] = o[k];
    }
    return obj;
  };

  dtools.copy = function copy(obj, deep) {
    if (deep) {
      var copy = {};
      for (var key in obj) {
        copy[key] = (typeof obj[key] === "object")
          ? dtools.copy(obj[key], true)
          : obj[key];
      }
      return copy;
    }
    return dtools.extend({}, obj);
  };

  dtools.copy.keys = function copyKeys(obj, keys, deep) {
    var copy = {};
    keys.forEach(function(key) {
      copy[key] = (deep && typeof obj[key] === "object")
        ? dtools.copy(obj[key], true)
        : obj[key];
    });
    return copy;
  };

  dtools.copy.properties = function copyProperties(obj, props, deep) {
    var copy = {};
    props.map(dtools.property).forEach(function(prop) {
      var value = prop(obj);
      prop.set(copy, (deep && typeof value === "object")
        ? dtools.copy(value, true)
        : value);
    });
    return copy;
  };

  // alias all simple-statistics methods to the dtools namespace
  dtools.extend(dtools, ss);

  // the identity function returns its first argument
  dtools.identity = function identity(d) {
    return d;
  };

  // the index function returns its second argument
  dtools.index = function index(d, i) {
    return i;
  };

  // functor returns a function that returns a fixed value
  dtools.functor = function functor(d) {
    if (typeof d === "function") return d;
    return function() {
      return d;
    };
  };

  // flatten an array, optionally preserving arrays for which `preserve`
  // returns truthy.
  dtools.flatten = function flatten(d, preserve, depth) {
    var flat = [];
    if (!depth) depth = 0;
    preserve = dtools.functor(preserve);
    d.forEach(function(e) {
      if (Array.isArray(e)) {
        if (preserve(e, depth)) {
          flat.push(e);
        } else {
          flat = flat.concat(dtools.flatten(e, preserve, depth + 1));
        }
      } else {
        flat.push(e);
      }
    });
    return flat;
  };

  // property generator
  dtools.property = function property(prop, name) {
    if (typeof prop === "function") {
      return dtools.rename(prop, name);
    } else {
      var property = dtools.property.getter(prop, name);
      property.get = property; // alias to propety.get()
      property.setter = function(value) {
        return dtools.property.setter(prop, value);
      };
      property.set = dtools.property.setter(prop);
      return property;
    }
  };

  // dtools.prop is shorthand for dtools.property
  dtools.prop = dtools.property;

  /*
   * Property getters are functions that return a named property (either a
   * simple key name or a JavaScript-like accessor expression, such as
   * "foo[1].bar", "geometry.coordinates[0][1]", or "name.first.length").
   */
  dtools.property.getter = function(prop, name) {
    var props = dt_parsePropertyNames(prop),
        len = props.length,
        getter = (len > 1)
          ? function(d) {
              for (var i = 0; i < len; i++) {
                var field = props[i];
                d = d[field];
              }
              return d;
            }
          : function(d) {
              return d[prop];
            };
    return dtools.rename(getter, name || prop);
  };

  /*
   * Property setters are functions that *set* a named property (as with
   * dtools.property.getter, this can be either an object key or an accessor
   * expression). The setter has different behaviors based on whether you
   * provide a `value`:
   *
   * If `value` is defined, the setter function sets the named property of the
   * function's first argument to the provided value. If `value` is a function,
   * it is evaluated for each input object. E.g.:
   *
   * var setFooToBar = dtools.property.setter("foo", "bar"),
   *     data = {foo: 1};
   * setFooToBar(data);
   * data.foo === "bar"; // true
   *
   * Otherwise, the setter is a function that takes an object and a value as
   * its arguments, and sets the named property to the provided value.
   *
   * var setFoo = dtools.property.setter("foo");
   * setFoo(data, "bar");
   * data.foo === "bar";
   */
  dtools.property.setter = function(prop, value) {
    var props = dt_parsePropertyTypes(prop),
        len = props.length,
        setter = (len > 1)
          ? function setPropertyNested(d, v) {
              for (var i = 0; i < len; i++) {
                var field = props[i];
                if (field.type) {
                  d = d[field.name] || (d[field.name] = new field.type());
                } else if (Array.isArray(d) && field.name === "") {
                  d[d.length] = v;
                } else {
                  d[field.name] = v;
                }
              }
              return d;
            }
          : function setProperty(d, v) {
              return d[prop] = v;
            };

    if (typeof value !== "undefined") {
      value = dtools.functor(value);
      return dtools.rename(function(d) {
        return set(d, value.call(this, d));
      }, prop);
    }
    return dtools.rename(setter, prop);
  };

  // sort comparator by property
  dtools.sort = function sort(key, order) {
    if (!order) order = dtools.ascending;
    else if (typeof order === "string") {
      var k = order;
      order = dtools.sort[k];
      if (!order) throw "Invalid sort order: " + k;
    }
    switch (typeof key) {
      case "function":
        break;

      case "string":
        var modifier = key.charAt(0);
        if (modifier in dtools.sort.modifiers) {
          var cmp = dtools.sort.modifiers[modifier];
          if (!dtools.sort[cmp]) throw "Invalid sort comparator: " + cmp;
          order = dtools.sort[cmp];
          key = key.substr(1);
          if (key.length === 0) key = dtools.identity;
        }
        break;
    }
    var prop = dtools.property(key);
    return function sort(a, b) {
      return order(prop(a), prop(b));
    };
  };

  // sort by multiple keys
  dtools.sort.multi = function() {
    var sorts = dtools.map(arguments, dtools.sort),
        len = sorts.length;
    return function sortMulti(a, b) {
      var order = 0;
      for (var i = 0; i < len; i++) {
        order = sorts[i].call(this, a, b);
        if (order != 0) break;
      }
      return order;
    };
  };

  // sort modifiers alias to 
  dtools.sort.modifiers = {
    "+": "ascending",
    "-": "descending",
    "<": "ascendingNumeric",
    ">": "descendingNumeric"
  };

  // ascending comparator
  dtools.ascending = dtools.sort.ascending = function ascending(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  };

  // descending comparator
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

  dtools.values = function values(d) {
    return d;
  };

  dtools.length = function length(d) {
    return d.length;
  };

  // extent: [min, max]
  dtools.extent = function extent(d) {
    var sorted = d.slice().sort(dtools.ascending);
    return [sorted[0], sorted[sorted.length - 1]];
  };

  // summarizing constructor
  dtools.summarize = function() {
    var props = [],
        stats = [];

    function summarize(data) {
      var summary = {};
      props.forEach(function(prop) {
        var fk = dtools.name(prop),
            sum = summary[fk] = {},
            values = data.map(prop);
        if (!fk) console.warn("no name for prop:", prop);
        stats.forEach(function(stat) {
          var sk = dtools.name(stat);
          if (!sk) console.warn("no name for stat:", stat);
          sum[sk] = stat(values);
        });
      });
      return summary;
    }

    summarize.properties = summarize.props = function(list) {
      if (!arguments.length) return props;
      props = list.map(function(prop) {
        return dtools.property(prop);
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

  // coerce a stat name into a stat function or property
  dtools.stat = function coerceStat(stat, name) {
    switch (typeof stat) {
      case "function":
        break;
      case "number":
      case "string":
        stat = (stat in dtools)
          ? dtools[stat]  // dtools.min
          : dtools.property(stat); // "length", 1
        break;
      default:
        throw "Unrecognized statistic type: " + stat;
    }
    return dtools.rename(stat, name);
  };

  dtools.template = function(tmpl) {
    var props = {};
    return function template(d) {
      return tmpl.replace(/{([^}]+)}/g, function(str, key) {
        if (key in props) {
          return props[key](d);
        } else {
          var prop = props[key] = dtools.property(key);
          return prop(d);
        }
      });
    };
  };

  ["slice", "filter", "map", "reduce"].forEach(function(method) {
    var array = [],
        slice = array.slice;
    dtools[method] = dtools.rename(function(d) {
      return array[method].apply(d, slice.call(arguments, 1));
    }, method);
  });

  /*
   * Improve the native Array.prototype methods:
   *
   * ["foo"].map("length") -> [3]
   *
   * ["foo"].forEach(callback) -> ["foo"]
   */
  dtools.improveArrayMethods = function() {
    var arrayPrototype = Array.prototype,
        map = arrayPrototype.map,
        forEach = arrayPrototype.forEach;

    // [{foo: "bar"}].map("foo") -> ["bar"]
    arrayPrototype.map = function betterMap(fn, context) {
      if (typeof fn === "string") {
        return this.map(dtools.property(fn), context);
      }
      return map.call(this, fn, context);
    };

    // [].forEach() should return the array
    arrayPrototype.forEach = function betterForEach() {
      forEach.apply(this, arguments);
      return this;
    };

    return dtools;
  };

  function dt_parsePropertyNames(prop) {
    return dt_parsePropertyTypes(prop)
      .map(function(type) {
        return type.name;
      });
  }

  function dt_parsePropertyTypes(prop) {
    var props = [],
        field = {name: ""};

    function pushField() {
      if (props.length && props[props.length - 1].type === Array) {
        var index = parseInt(field.name);
        if (!isNaN(index)) {
          field.name = index;
        }
      }
      props.push(field);
      field = {name: ""};
    }

    while (prop.length) {
      var chr = prop.charAt(0);
      prop = prop.substr(1);
      if (chr === ".") {
        field.type = Object;
      } else if (chr === "[") {
        field.type = Array;
      } else if (chr === "]") {
        if (prop.length) {
          var next = prop.charAt(0);
          switch (next) {
            case ".": field.type = Object; break;
            case "[": field.type = Array; break;
            default:
              throw "Expected '.' or '[' after ']'; got '" + next + "'";
          }
        }
        chr = "";
        prop = prop.substr(1);
      }

      if (field.type) {
        pushField();
      } else {
        field.name += chr;
      }
    }
    pushField();
    return props;
  }

})(this);
