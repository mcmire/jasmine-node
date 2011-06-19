var fs   = require('fs'),
    sys  = require('sys'),
    path = require('path'),
    console = require('console');

var jasmineNode = exports;

function requireStandaloneJasmine() {
  var jasmine;

  var filename = __dirname + '/jasmine-1.0.1.js';
  // Create a global window object, as the Jasmine source code assumes that
  // this is present.
  global.window = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
  };

  // Usually we'd just use a require, but the Jasmine source doesn't return
  // the global Jasmine object. So instead, we read the code, tack this
  // object to the end, and then evaluate the code within this context.
  var src = fs.readFileSync(filename);
  var minorVersion = process.version.match(/\d\.(\d)\.\d/)[1];
  switch (minorVersion) {
    case "1":
    case "2":
      jasmine = process.compile(src + '\njasmine;', filename);
      break;
    default:
      jasmine = require('vm').runInThisContext(src + "\njasmine;", filename);
  }

  // Clean up after ourselves so we don't pollute the global namespace.
  delete global.window;

  return jasmine;
}

// Go ahead and load Jasmine
var jasmine = requireStandaloneJasmine();

// Searches in the given directory (using the given pattern) for helper files,
// and loads them into the global namespace.
//
jasmineNode.loadHelpers = function(dir, pattern) {
  var helpers = jasmineNode.findAllSpecFiles([dir], pattern);
  sys.puts(sys.inspect(helpers));
  helpers.forEach(function(file) {
    var helper = require(file);
    for (var key in helper) {
      global[key] = helper[key];
    }
  })
}

// Given an array of files or directories, searches for spec files (using
// the given pattern) and runs them.
//
jasmineNode.executeSpecs = function(entries, pattern, options) {
  var log = [];
  var columnCounter = 0;
  var start = 0;
  var elapsed = 0;
  var specs = jasmineNode.findAllSpecFiles(entries, pattern);

  var ansi = {
    green: '\033[32m',
    red: '\033[31m',
    yellow: '\033[33m',
    none: '\033[0m'
  };

  specs.forEach(function(file) {
    require(file);
  })

  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.reporter = {
    log: function(str) {
    },

    reportSpecStarting: function(runner) {
    },

    reportRunnerStarting: function(runner) {
      sys.puts('Started');
      start = Number(new Date);
    },

    reportSuiteResults: function(suite) {
      var specResults = suite.results();
      var path = [];
      while(suite) {
        path.unshift(suite.description);
        suite = suite.parentSuite;
      }
      var description = path.join(' ');

      if (options.verbose) {
        log.push('Spec ' + description);
      }

      specResults.items_.forEach(function(spec){
        if (spec.failedCount > 0 && spec.description) {
          if (!options.verbose) {
            log.push(description);
          }
          log.push('  it ' + spec.description);
          spec.items_.forEach(function(result){
            log.push('  ' + result.trace.stack + '\n');
          });
        } else {
          if (options.verbose) {
            log.push('  it ' + spec.description);
          }
        }
      });
    },

    reportSpecResults: function(spec) {
      var result = spec.results();
      var msg = '';
      if (result.passed())
      {
        msg = (options.showColors) ? (ansi.green + '.' + ansi.none) : '.';
//      } else if (result.skipped) {  TODO: Research why "result.skipped" returns false when "xit" is called on a spec?
//        msg = (options.showColors) ? (ansi.yellow + '*' + ansi.none) : '*';
      } else {
        msg = (options.showColors) ? (ansi.red + 'F' + ansi.none) : 'F';
      }
      sys.print(msg);
      if (columnCounter++ < 50) return;
      columnCounter = 0;
      sys.print('\n');
    },


    reportRunnerResults: function(runner) {
      elapsed = (Number(new Date) - start) / 1000;
      sys.puts('\n');
      log.forEach(function(log){
        sys.puts(log);
      });
      sys.puts('Finished in ' + elapsed + ' seconds');

      var summary = jasmineNode.printRunnerResults(runner);
      if (options.showColors) {
        if (runner.results().failedCount === 0) {
          sys.puts(ansi.green + summary + ansi.none);
        } else {
          sys.puts(ansi.red + summary + ansi.none);
        }
      } else {
        sys.puts(summary);
      }
      if (options.onComplete) {
        options.onComplete(runner, log);
      }
    }
  };
  jasmineEnv.execute();
}

// Given an array of files or directories, searches recursively for files
// whose filenames match the given pattern. Returns the array of matched
// filenames.
//
jasmineNode.findAllSpecFiles = function(entries, pattern) {
  return entries.reduce(function(allFiles, entry) {
    var file = entry, dir = entry;
    if (fs.statSync(entry).isFile()) {
      if (file.match(pattern)) {
        console.log("File", file, "matches pattern", pattern);
        allFiles.push(file);
      }
    } else {
      var files = fs.readdirSync(dir).map(function(entry) {
        return path.join(dir, entry);
      })
      allFiles.push.apply(allFiles, jasmineNode.findAllSpecFiles(files, pattern));
    }
    return allFiles;
  }, []);
};

// Handle the results of running all the specs.
//
jasmineNode.printRunnerResults = function(runner) {
  var results = runner.results();
  var suites = runner.suites();
  var msg = '';
  msg += suites.length + ' test' + ((suites.length === 1) ? '' : 's') + ', ';
  msg += results.totalCount + ' assertion' + ((results.totalCount === 1) ? '' : 's') + ', ';
  msg += results.failedCount + ' failure' + ((results.failedCount === 1) ? '' : 's') + '\n';
  return msg;
};

// XXX: What are these for??
function now() {
  return new Date().getTime();
}
jasmineNode.asyncSpecWait = function() {
  var wait = jasmineNode.asyncSpecWait;
  wait.start = now();
  wait.done = false;
  (function innerWait(){
    waits(10);
    runs(function() {
      if (wait.start + wait.timeout < now()) {
        expect('timeout waiting for spec').toBeNull();
      } else if (wait.done) {
        wait.done = false;
      } else {
        innerWait();
      }
    });
  })();
};
jasmineNode.asyncSpecWait.timeout = 4 * 1000;
jasmineNode.asyncSpecDone = function(){
  jasmineNode.asyncSpecWait.done = true;
};