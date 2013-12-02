var dstream = module.exports = {};

dstream.min = function min() {
  var min = Number.POSITIVE_INFINITY;
  function stream(n) {
    if (n < min) min = n;
  }
  stream.value = function() {
    return min;
  };
  return stream;
};

dstream.max = function max() {
  var max = Number.NEGATIVE_INFINITY;
  function stream(n) {
    if (n > max) max = n;
  }
  stream.value = function() {
    return max;
  };
  return stream;
};

dstream.extent = function extent() {
  var min = Number.POSITIVE_INFINITY,
      max = Number.NEGATIVE_INFINITY;
  function stream(n) {
    if (n < min) min = n;
    if (n > max) max = n;
  }
  stream.value = function() {
    return [min, max];
  };
  return stream;
};

dstream.sum = function sum() {
  var sum = 0;
  function stream(n) {
    sum += n;
  }
  stream.value = function() {
    return sum;
  };
  return stream;
};

dstream.mean = function() {
  var sum = 0,
      len = 0;
  function stream(n) {
    sum += n;
    len++;
  }
  stream.value = function mean() {
    return (len > 0) ? sum / len : null;
  };
  return stream;
};

dstream.median = function median() {
  var min = Number.POSITIVE_INFINITY,
      max = Number.NEGATIVE_INFINITY,
      len = 0;
  function stream(n) {
    if (n < min) min = n;
    if (n > max) max = n;
    len++;
  }
  stream.value = function() {
    return (len > 0) ? (min + (max - min) / 2) : null;
  };
};

dstream.unique = function unique() {
  var values = [];
  function stream(n) {
    if (values.indexOf(n) === -1) values.push(n);
  }
  stream.value = function() {
    return values;
  };
  return stream;
};

dstream.uniqueCount = function uniqueCount() {
  var values = [];
  function stream(n) {
    if (values.indexOf(n) === -1) values.push(n);
  }
  stream.value = function() {
    return values.length;
  };
  return stream;
};

dstream.shortest = function common() {
  var shortest, seen = false;
  function stream(d) {
    if (!seen || d.length < shortest.length) {
      shortest = d;
      seen = true;
    }
  }
  stream.value = function() {
    return shortest;
  };
  return stream;
};

dstream.longest = function common() {
  var longest, seen = false;
  function stream(d) {
    if (!seen || d.length > longest.length) {
      longest = d;
      seen = true;
    }
  }
  stream.value = function() {
    return longest;
  };
  return stream;
};

dstream.variance = function variance() {
  var mean = dstream.mean(),
      values = [];
  function stream(d) {
    mean(d);
    values.push(d);
  }
  stream.value = function() {
    var m = mean.value(),
        sum = 0;
    if (isNaN(m) || m === null) return null;
    for (var i = 0, len = values.length; i < len; i++) {
      sum += Math.pow(values[i] - m, 2);
    }
    return sum / len;
  };
  return stream;
};

dstream.stddev = function stddev() {
  var variance = dstream.variance();
  function stream(d) {
    variance(d);
  }
  stream.value = function() {
    return Math.sqrt(variance.value());
  };
  return stream;
};
