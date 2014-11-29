# Commandable

A minimal command-line interface framework powered by
[minimist](https://github.com/substack/minimist).

## Features:

- Commands, sub-commands, sub-sub-commands, etc
- Options are scoped to their commands
- Return promises from commands to defer exit
- Automatic help output if you describe it
- Control option parsing with standard minimist options

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
});
```

If you want callbacks, replace `run` with `callback`, make sure you declare the
callback argument, and call it like `cb(err)` or `cb(null, result)`:

```
commandable({
    callback: function(cmd, cb) {
        // cb(err) or cb(null, result);
    },
    commands: {
        foo: function(cmd, cb) {}
        // etc
    }
});
```

The `cmd` argument looks like this:

```
{
    name: 'command',
    cfg:  { /* command config       */ },
    sup:  { /* super command config */ },
    opts: { /* parsed options       */ },
    args: { /* parsed arguments     */ },
    rest: [ /* remaining arguments  */ ]
}
```

### TODO

- bash completions
- catch errors
- env vars
- notes
- pre- and post-command callbacks
- required rest args
- Date type
- opt groups for help output
