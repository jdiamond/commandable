# Commandable

A minimal command-line interface framework powerd by [minimist](https://github.com/substack/minimist).

## Features:

- Commands, sub-commands, sub-sub-commands, etc
- Options are scoped to their commands
- Control option parsing with standard minimist options
- API supports both promises and callbacks

## Install

```
npm i -S commandable
```

## Usage

```
var commandable = require('commandable');

// commandable(args, opts, callback);

// args defaults to process.argv.slice(2)
// opts are minimist options plus a few extras
// callback is optional
// returns a promise

// Example:

commandable({
    // minimist options go here
    run: function(opts) {
        // return a value or a promise
    },
    commands: {
        foo: function(opts) {}, // run with no minimist options
        bar: {
            // minimist options go here
            run: function(opts) {},
            commands: {
                baz: function(opts) {}, // run with no minimist options
                quux: {
                    // minimist options go here
                    run: function(opts) {}
                }
            }
        }
    }
});
```

If you want callbacks, replace `run` with `callback`, make sure you declare the callback argument, and call it like `cb(err)` or `cb(null, result)`:

```
commandable({
    // minimist options go here
    callback: function(opts, cb) {
        // cb(err, result);
    },
    commands: {
        foo: function(opts, cb) {} // callback with no minimist options
        // etc
    }
});
```

The `opts` argument is just the object returned from minimist plus a `$` property pointing to the "parent" options.

For example, the `opts` argument passed in to the above example with this command line:

```
./example.js --aaa bbb bar --ccc ddd baz --eee fff
```

...looks like this:

```
{ _: [],
  eee: 'fff',
  '$':
   { _: [ 'baz', '--eee', 'fff' ],
     ccc: 'ddd',
     '$':
      { _: [ 'bar', '--ccc', 'ddd', 'baz', '--eee', 'fff' ],
        aaa: 'bbb',
        '$': undefined } } }
```
