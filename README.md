# Commandable

A minimal command-line interface framework powered by
[minimist](https://github.com/substack/minimist).

## Features

- Commands, sub-commands, sub-sub-commands, etc
- Options are scoped to their commands
- Commands can return promises or use callbacks to defer exit
- Automatic help output if you describe it
- Control option parsing with standard minimist options

## License

MIT

## Install

```
npm i -S commandable
```

## Usage

```
var commandable = require('commandable');

commandable({
    init: function(cmd) {
        // always invoked before any sub-commands
    },
    commands: {
        foo: function(cmd) {
            // terse style for quick-and-dirty commands
            // no options or arguments
            // invoked when argv is `node script.js foo`
        },
        bar: {
            help: 'do bar',
            options: {
                booleanOpt: Boolean
                numberOpt: Number
                stringOpt: String
            },
            arguments: '<required> [optional]',
            init: function(cmd) {
                // invoked after super `init` and before `run` or any sub-commands
            },
            run: function(cmd) {
                // invoked when argv is `node script.js bar`
                // options will be in `cmd.opts`
                // arguments will be in `cmd.args`
            },
            commands: {
                baz: {
                    help: 'do baz',
                    options: {
                        anotherOpt: {
                            type: String,
                            help: 'this is the help text',
                            default: 'this is the default value'
                        }
                    },
                    arguments: [
                        { name: 'requiredArg', required: true },
                        { name: 'optionalArg', required: false }
                    ],
                    run: function(cmd) {
                        // invoked when argv is `node script.js bar baz`
                        // options will be in `cmd.opts`
                        // arguments will be in `cmd.args`
                    }
                }
            }
        }
    }
}).then(function(result) {
    // invoked after command completes
});
```

If you prefer callbacks, declare a second callback argument, and call it like
`cb(err)` or `cb(null, result)`:

```
commandable({
    run: function(cmd, cb) {
        // cb(err) or cb(null, result);
    },
    commands: {
        foo: function(cmd, cb) {
            // cb(err) or cb(null, result);
        }
    }
}, function(err, result) {
    // invoked after command completes
});
```

The `cmd` argument looks like this:

```
{
    name: 'command',
    opts: { /* parsed options       */ },
    argv: [ /* positional arguments */ ],
    args: { /* named arguments      */ },
    rest: [ /* remaining arguments  */ ],
    cfg:  { /* command config       */ },
    sup:  { /* super command config */ }
}
```

## TODO

Additional features:

- bash completions
- exit command callbacks
- Date type
- multi options
- default values for optional arguments
- validation functions for options and arguments
- argument types

Related to help output:

- notes (as array of strings or path to file?)
- placeholders in options (--foo=<bar>)
- opt groups for help output
- don't output help and exit when 'h' or 'help' option is configured
