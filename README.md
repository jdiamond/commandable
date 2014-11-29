# Commandable

A minimal command-line interface framework powered by
[minimist](https://github.com/substack/minimist).

## Features:

- Commands, sub-commands, sub-sub-commands, etc
- Options are scoped to their commands
- Control option parsing with standard minimist options
- Automatic help output if you describe it

## Install

```
npm i -S commandable
```

## Usage

```
var commandable = require('commandable');

commandable({
    commands: {
        foo: function(cmd) {},
        bar: {
            help: 'do bar',
            options: {},
            arguments: '',
            run: function(cmd) {},
            commands: {
                baz: function(cmd) {},
                quux: {
                    help: '',
                    options: {},
                    arguments: [],
                    run: function(cmd) {}
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
    cfg: { /* command config */ },
    sup: { /* super command config */ },
    opts: { /* parsed options */ },
    args: { /* parsed arguments */ },
    rest: [ /* remaining arguments */ ]
}
```

### TODO

- bash completions
- catch errors
- env vars
- notes
- default in opts
- pre- and post-command callbacks
- required rest args
- Date type
