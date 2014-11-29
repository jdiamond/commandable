#!/usr/bin/env node

'use strict';

var Promise = require('bluebird');
var test = require('tape');

var commandable = require('./commandable');

Promise.longStackTraces();

var errorOutput = '';

var cfg = {
    commands: {
        fn: function(cmd) {
            return cmd;
        },
        fn2: function(cmd, callback) {
            callback(null, cmd);
        },
        obj: {
            run: function(cmd) {
                return cmd;
            }
        },
        obj2: {
            callback: function(cmd, callback) {
                callback(null, cmd);
            }
        },
        sub: {
            run: function(cmd) {
                return cmd;
            },
            commands: {
                sub2: function(cmd) {
                    return cmd;
                }
            }
        },
        err: function(cmd) {
            return Promise.reject(new Error('err'));
        },
        err2: function(cmd, callback) {
            callback(new Error('err2'));
        },
        throw: function(cmd) {
            throw new Error('throw');
        },
        opt: {
            options: {
                bool: Boolean,
                num: Number,
                str: String
            },
            run: function(cmd) {
                return cmd;
            }
        },
        camelCaseOpts: {
            options: {
                fooBar: String,
                bazQuux: String
            },
            run: function(cmd) {
                return cmd;
            }
        },
        defaultOpts: {
            options: {
                foo: {
                    type: String,
                    default: 'defaultFoo'
                },
                bar: {
                    type: String,
                    default: 'defaultBar'
                }
            },
            run: function(cmd) {
                return cmd;
            }
        },
        aliasedOpts: {
            options: {
                firstOpt: {
                    type: String,
                    alias: 'firstAlias' // not array
                },
                stringAlias: 'firstOpt', // string instead of object
                secondOpt: {
                    alias: [ 'secondAlias', 'thirdAlias' ] // in array
                }
            },
            run: function(cmd) {
                return cmd;
            }
        },
        paramCaseArgs: {
            arguments: '<foo-bar> [baz-quux]',
            run: function(cmd) {
                return cmd;
            }
        }
    },
    run: function(cmd) {
        return cmd;
    },
    error: function(output) {
        errorOutput += output;
    }
};

test('fn', function(t) {
    commandable([ '-a', 'b', 'fn', '-c', 'd' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'fn');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('fn2', function(t) {
    commandable([ '-a', 'b', 'fn2', '-c', 'd' ], cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, 'fn2');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('obj', function(t) {
    commandable([ '-a', 'b', 'obj', '-c', 'd' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'obj');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('obj2', function(t) {
    commandable([ '-a', 'b', 'obj2', '-c', 'd' ], cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, 'obj2');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('sub', function(t) {
    commandable([ '-a', 'b', 'sub', '-c', 'd' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'sub');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('sub2', function(t) {
    commandable([ '-a', 'b', 'sub', '-c', 'd', 'sub2', '-e', 'f' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'sub2');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.equal(cmd.opts.e, 'f');
        t.end();
    });
});

test('none', function(t) {
    commandable([ '-a', 'b', '-c', 'd' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, undefined);
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('callback', function(t) {
    commandable([ '-a', 'b', '-c', 'd' ], cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, undefined);
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('err', function(t) {
    commandable([ '-a', 'b', 'err', '-c', 'd' ], cfg).catch(function(err) {
        t.equal(err.message, 'err');
        t.end();
    });
});

test('err2', function(t) {
    commandable([ '-a', 'b', 'err2', '-c', 'd' ], cfg, function(err) {
        t.equal(err.message, 'err2');
        t.end();
    });
});

test('throw', function(t) {
    commandable([ '-a', 'b', 'throw', '-c', 'd' ], cfg).catch(function(err) {
        t.equal(err.message, 'throw');
        t.end();
    });
});

test('known options', function(t) {
    commandable([ 'opt', '--bool', '--num', '123', '--str', 'abc' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'opt');
        t.equal(cmd.opts.bool, true);
        t.equal(cmd.opts.num, 123);
        t.equal(cmd.opts.str, 'abc');
        t.end();
    });
});

test('unknown options', function(t) {
    errorOutput = '';

    commandable([ 'opt', '--foo', 'bar' ], cfg)
        .then(function() {
            t.ok(errorOutput);
            t.end();
        })
    ;
});

test('camelCaseOpts', function(t) {
    commandable([ 'camel-case-opts', '--foo-bar', 'opt1', '--baz-quux', 'opt2' ], cfg).then(function(cmd) {
        console.log(cmd);
        t.equal(cmd.opts.fooBar, 'opt1');
        t.equal(cmd.opts.bazQuux, 'opt2');
        t.end();
    });
});

test('defaultOpts', function(t) {
    commandable([ 'default-opts', '--foo', 'notDefaultFoo' ], cfg).then(function(cmd) {
        t.equal(cmd.opts.foo, 'notDefaultFoo');
        t.equal(cmd.opts.bar, 'defaultBar');
        t.end();
    });
});

test('aliasedOpts', function(t) {
    commandable([ 'aliased-opts', '--first-opt', 'foo', '--secondOpt', 'bar' ], cfg).then(function(cmd) {
        t.equal(cmd.opts.firstOpt, 'foo');
        t.equal(cmd.opts['first-opt'], 'foo');
        t.equal(cmd.opts.firstAlias, 'foo');
        t.equal(cmd.opts['first-alias'], 'foo');
        t.equal(cmd.opts.stringAlias, 'foo');
        t.equal(cmd.opts['string-alias'], 'foo');
        t.equal(cmd.opts.secondOpt, 'bar');
        t.equal(cmd.opts['second-opt'], 'bar');
        t.equal(cmd.opts.secondAlias, 'bar');
        t.equal(cmd.opts['second-alias'], 'bar');
        t.equal(cmd.opts.thirdAlias, 'bar');
        t.equal(cmd.opts['third-alias'], 'bar');
        t.end();
    });
});

test('paramCaseArgs', function(t) {
    commandable([ 'param-case-args', 'arg1', 'arg2', 'arg3', 'arg4' ], cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'paramCaseArgs');
        t.equal(Object.keys(cmd.args).length, 2);
        t.equal(cmd.args.fooBar, 'arg1');
        t.equal(cmd.args.bazQuux, 'arg2');
        t.end();
    });
});

test('unknown command', function(t) {
    errorOutput = '';

    commandable([ 'unknown' ], cfg)
        .then(function() {
            t.ok(errorOutput);
            t.end();
        })
    ;
});

test('normalize arguments', function(t) {
    var normal = commandable.normalize({
        arguments: '<required> [optional]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'required');
    t.equal(normal.arguments[1].name, 'optional');

    t.end();
});

test('normalize arguments with dashes', function(t) {
    var normal = commandable.normalize({
        arguments: '<required-arg> [optional-arg]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'requiredArg');
    t.equal(normal.arguments[1].name, 'optionalArg');

    t.end();
});

test('normalize arguments with spaces', function(t) {
    var normal = commandable.normalize({
        arguments: '<required arg> [optional arg]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'requiredArg');
    t.equal(normal.arguments[1].name, 'optionalArg');

    t.end();
});

test('normalize options', function(t) {
    var normal = commandable.normalize({
        options: {
            bool: Boolean,
            str: String
        }
    });

    t.equal(Object.keys(normal.options).length, 2);
    t.equal(normal.options.bool.type, Boolean);
    t.equal(normal.options.str.type, String);

    t.end();
});

test('normalize options with dashes', function(t) {
    var normal = commandable.normalize({
        options: {
            'bool-opt': Boolean,
            'str-opt': String
        }
    });

    t.equal(Object.keys(normal.options).length, 2);
    t.equal(normal.options.boolOpt.type, Boolean);
    t.equal(normal.options.strOpt.type, String);

    t.end();
});

test('normalize aliased options', function(t) {
    var normal = commandable.normalize({
        options: {
            firstOpt: {
                type: String,
                alias: 'firstAlias' // not array
            },
            stringAlias: 'firstOpt', // string instead of object
            secondOpt: {
                alias: [ 'secondAlias', 'thirdAlias' ] // in array
            }
        }
    });

    t.equal(Object.keys(normal.options).length, 2);
    t.equal(normal.options.firstOpt.alias.length, 5);
    t.equal(normal.options.secondOpt.alias.length, 5);

    t.end();
});

test('normalize commands', function(t) {
    var normal = commandable.normalize({
        commands: {
            fn: function(cmd) {},
            obj: { run: function(cmd) {} },
            parent: {
                commands: {
                    child: function(cmd) {}
                }
            }
        }
    });

    t.equal(Object.keys(normal.commands).length, 3);

    t.equal(normal.commands.fn.name, 'fn');
    t.equal(typeof normal.commands.fn.run, 'function');

    t.equal(normal.commands.obj.name, 'obj');
    t.equal(typeof normal.commands.obj.run, 'function');

    t.equal(normal.commands.parent.name, 'parent');
    t.equal(normal.commands.parent.commands.child.name, 'child');
    t.equal(normal.commands.parent.commands.child.sup.name, 'parent');

    t.end();
});

test('normalize main command', function(t) {
    var normal = commandable.normalize(function(cmd) {});

    t.equal(typeof normal, 'object');
    t.equal(typeof normal.run, 'function');

    t.end();
});
