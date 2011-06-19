var jasmineNode = require('./index.js'),
    sys = require('sys'),
    path = require('path');

var options = {
  verbose: false,
  showColors: true
};
var specsDir = path.join(process.cwd(), "spec/javascripts");
var helpersDir = path.join(specsDir, "helpers");
var extensions = ["js"];
var files = [];

var progname = process.argv[0];
var args = process.argv.slice(2);

while (args.length) {
  var arg = args.shift();

  switch (arg) {
    case '--color':
      options.showColors = true;
      break;
    case '--no-color':
      options.showColors = false;
      break;
    case '--coffee':
      require('coffee-script');
      extensions.push('coffee');
      break;
    case '-i':
    case '--include':
      var dir = args.shift();
      if (!path.existsSync(dir)) {
        throw new Error("Include path '" + dir + "' doesn't exist!");
      }
      require.paths.unshift(dir);
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '-h':
    case '--help':
      help(0);
    default:
      if (arg.match(/^-/)) {
        sys.print("Invalid option " + arg + "!\n");
        help(1);
      }
      files.push(args.shift());
  }
}

if (files.length == 0) {
  if (path.existsSync(specsDir)) {
    files = [specsDir];
  } else {
    msg =
      "I couldn't find a spec/javascripts directory here, so I'm not sure where your Jasmine files are.\n" +
      "Give me a path to a spec file or a Jasmine test directory.\n"
    throw new Error(msg);
  }
}

var helperPattern = new RegExp("\.(?:"+extensions.join("|")+")$")
jasmineNode.loadHelpers(helpersDir, helperPattern);

var specPattern = new RegExp("(?:_s|-s|S)pec\.(?:"+extensions.join("|")+")$");
jasmineNode.executeSpecs(files, specPattern, {
  verbose: options.verbose,
  showColors: options.showColors,
  onComplete: function(runner, log) {
    sys.print('\n');
    // Ensure that stdout is flushed to the console, as otherwise the output
    // gets cut off before the node process exits. This is far from the best
    // solution since it's (evidently) vulnerable to a race condition, but I
    // don't think this problem has been addressed in Node just yet. See:
    // * <https://groups.google.com/forum/#!topic/nodejs-dev/Tj_HNQbvtZs>
    // * <https://groups.google.com/forum/#!topic/nodejs/P74WE_L2-X4>
    while (!process.stdout.flush()) ;
    process.exit(-runner.results().failedCount);
  }
})

function help(status) {
  sys.print([
    'USAGE: '+progname+' [OPTIONS] PATH1 PATH2 ...'
  , ''
  , 'OPTIONS:'
  , '  --[no-]color          - enable/disable color coding for output (default: enabled)'
  , '  --coffee              - load coffee-script which allows execution .coffee files'
  , '  -i DIR, --include DIR - add given directory to node include paths'
  , '  --verbose             - print extra information per each test run'
  , ''
  ].join("\n"));

  process.exit(status);
}
