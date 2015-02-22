#!/usr/bin/env node

'use strict';

var Promise = require('bluebird');
var test = require('tape');

var commandable = require('./commandable');
var normalize = require('./normalize');

Promise.longStackTraces();

test('commands can accept any options by declaring none', function(t) {
    var args = [ '-a', 'b', 'cmd', '-c', 'd' ];
    var cfg = {
        commands: {
            cmd: function(cmd) {
                return cmd;
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'cmd');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('commands with two declared arguments get passed a callback', function(t) {
    var args = [ '-a', 'b', 'cmd', '-c', 'd' ];
    var cfg = {
        commands: {
            cmd: function(cmd, callback) {
                callback(null, cmd);
            }
        }
    };

    commandable(args, cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, 'cmd');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('command objects normally have a run method', function(t) {
    var args = [ '-a', 'b', 'cmd', '-c', 'd' ];
    var cfg = {
        commands: {
            cmd: {
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'cmd');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('command objects with a run method that declares two arguments receives a callback function', function(t) {
    var args = [ '-a', 'b', 'cmd', '-c', 'd' ];
    var cfg = {
        commands: {
            cmd: {
                run: function(cmd, callback) {
                    callback(null, cmd);
                }
            }
        }
    };

    commandable(args, cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, 'cmd');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('commands can have sub commands', function(t) {
    var args = [ '-a', 'b', 'super', '-c', 'd', 'sub', '-e', 'f' ];
    var cfg = {
        commands: {
            super: {
                run: function(cmd) {
                    return cmd;
                },
                commands: {
                    sub: function(cmd) {
                        return cmd;
                    }
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'sub');
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.equal(cmd.opts.e, 'f');
        t.end();
    });
});

test('commands aren\'t required', function(t) {
    var args = [ '-a', 'b', '-c', 'd' ];
    var cfg = {
        run: function(cmd) {
            return cmd;
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, undefined);
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('main function accepts an optional callback', function(t) {
    var args = [ '-a', 'b', '-c', 'd' ];
    var cfg = {
        run: function(cmd) {
            return cmd;
        }
    };

    commandable(args, cfg, function(err, cmd) {
        if (err) { return t.end(err); }
        t.equal(cmd.cfg.name, undefined);
        t.equal(cmd.opts.a, 'b');
        t.equal(cmd.opts.c, 'd');
        t.end();
    });
});

test('rejected promises log an error and exit', function(t) {
    var errorMessage = null;
    var exitCode = 0;
    var args = [ '-a', 'b', 'err', '-c', 'd' ];
    var cfg = {
        commands: {
            err: function(cmd) {
                return Promise.reject(new Error('err'));
            }
        },
        error: function(message) {
            errorMessage = message;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg).then(function() {
        t.ok(errorMessage);
        t.ok(exitCode);
        t.end();
    });
});

test('commands that call back with an error log an error and exit', function(t) {
    var errorMessage = null;
    var exitCode = 0;
    var args = [ '-a', 'b', 'err2', '-c', 'd' ];
    var cfg = {
        commands: {
            err2: function(cmd, callback) {
                callback(new Error('err2'));
            }
        },
        error: function(message) {
            errorMessage = message;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg).then(function() {
        t.ok(errorMessage);
        t.ok(exitCode);
        t.end();
    });
});

test('commands that throw log an error and exit', function(t) {
    var errorMessage = null;
    var exitCode = 0;
    var args = [ '-a', 'b', 'throw', '-c', 'd' ];
    var cfg = {
        commands: {
            throw: function(cmd) {
                throw new Error('thrown exception');
            }
        },
        error: function(message) {
            errorMessage = message;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg).then(function() {
        t.ok(errorMessage);
        t.ok(exitCode);
        t.end();
    });
});

test('boolean, number, and string options are supported', function(t) {
    var args = [ 'opt', '--bool', '--num', '123', '--str', 'abc' ];
    var cfg = {
        commands: {
            opt: {
                options: {
                    bool: Boolean,
                    num: Number,
                    str: String
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'opt');
        t.equal(cmd.opts.bool, true);
        t.equal(cmd.opts.num, 123);
        t.equal(cmd.opts.str, 'abc');
        t.end();
    });
});

test('unknown options result in no command running and an error logged', function(t) {
    var errorLogged = false;
    var exitCode = 0;
    var args = [ 'opt', '--foo', 'bar' ];
    var cfg = {
        commands: {
            opt: {
                options: {
                    dummy: String // at least one option is required
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        },
        error: function(message) {
            errorLogged = true;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.ok(!cmd);
        t.ok(errorLogged);
        t.ok(exitCode);
        t.end();
    });
});

test('unknown can be defined to skip errors', function(t) {
    var errorLogged = false;
    var exitCode = 0;
    var args = [ 'opt', '--foo', 'bar' ];
    var cfg = {
        commands: {
            opt: {
                options: {
                    dummy: String // at least one option is required
                },
                unknown: function() {},
                run: function(cmd) {
                    return cmd;
                }
            }
        },
        error: function(message) {
            errorLogged = true;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.ok(cmd);
        t.ok(!errorLogged);
        t.ok(!exitCode);
        t.end();
    });
});

test('options can be camelCase in code and param-case in args', function(t) {
    var args = [ 'camel-case-opts', '--foo-bar', 'opt1', '--baz-quux', 'opt2' ];
    var cfg = {
        commands: {
            camelCaseOpts: {
                options: {
                    fooBar: String,
                    bazQuux: String
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.opts.fooBar, 'opt1');
        t.equal(cmd.opts.bazQuux, 'opt2');
        t.end();
    });
});

test('options can have default values', function(t) {
    var args = [ 'default-opts', '--foo', 'notDefaultFoo' ];
    var cfg = {
        commands: {
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
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.opts.foo, 'notDefaultFoo');
        t.equal(cmd.opts.bar, 'defaultBar');
        t.end();
    });
});

test('options can have aliases', function(t) {
    var args = [ 'aliased-opts', '--first-opt', 'foo', '--secondOpt', 'bar' ];
    var cfg = {
        commands: {
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
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
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

test('single-letter option aliases are case-sensitive', function(t) {
    var args = [ '--host', 'foo' ];
    var cfg = {
        options: {
            host: { type: String, alias: [ 'H' ] }
        },
        run: function(cmd) {
            return cmd;
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.opts.host, 'foo', 'aaa');
        t.equal(cmd.opts.H, 'foo', 'bbb');
        t.notEqual(cmd.opts.h, 'foo', 'ccc');
        t.end();
    });
});

test('options can get default values from the environment', function(t) {
    var args = [ 'my-cmd' ];
    var cfg = {
        commands: {
            myCmd: {
                options: {
                    myOpt: {
                        type: String,
                        env: 'MY_VAR'
                    }
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        },
        env: {
            MY_VAR: 'myVal'
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'myCmd');
        t.equal(cmd.opts.myOpt, 'myVal');
        t.end();
    });
});

test('env can be a function', function(t) {
    var args = [ 'my-cmd' ];
    var cfg = {
        commands: {
            myCmd: {
                options: {
                    myOpt: {
                        type: String,
                        env: 'MY_VAR'
                    }
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        },
        env: function(key) {
            return 'myDynamicVal';
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'myCmd');
        t.equal(cmd.opts.myOpt, 'myDynamicVal');
        t.end();
    });
});

test('default values are used after the environment is checked', function(t) {
    var args = [ 'my-cmd' ];
    var cfg = {
        commands: {
            myCmd: {
                options: {
                    myOpt: {
                        type: String,
                        env: 'MY_VAR',
                        default: 'myDefault'
                    }
                },
                run: function(cmd) {
                    return cmd;
                }
            }
        },
        env: {
            MY_VAR: undefined
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'myCmd');
        t.equal(cmd.opts.myOpt, 'myDefault');
        t.end();
    });
});

test('arguments can be param-case in spec and camelCase in code', function(t) {
    var args = [ 'param-case-args', 'arg1', 'arg2', 'arg3', 'arg4' ];
    var cfg = {
        commands: {
            paramCaseArgs: {
                arguments: '<foo-bar> [baz-quux]',
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'paramCaseArgs');
        t.equal(Object.keys(cmd.args).length, 2);
        t.equal(cmd.args.fooBar, 'arg1');
        t.equal(cmd.args.bazQuux, 'arg2');
        t.end();
    });
});

test('arguments get parsed into argv, args, and rest', function(t) {
    var args = [ 'parse-args', 'arg1', 'arg2', 'arg3', 'arg4' ];
    var cfg = {
        commands: {
            parseArgs: {
                arguments: '<foo-bar> [baz-quux]',
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'parseArgs');
        t.deepEqual(cmd.argv, [ 'arg1', 'arg2', 'arg3', 'arg4' ]);
        t.deepEqual(cmd.args, { fooBar: 'arg1', bazQuux: 'arg2' });
        t.deepEqual(cmd.rest, [ 'arg3', 'arg4' ]);
        t.end();
    });
});

test('multi arguments get parsed into an array', function(t) {
    var args = [ 'multi-args', 'arg1', 'arg2', 'arg3', 'arg4' ];
    var cfg = {
        commands: {
            multiArgs: {
                arguments: '<files...>',
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'multiArgs');
        t.deepEqual(cmd.args.files, [ 'arg1', 'arg2', 'arg3', 'arg4' ]);
        t.end();
    });
});

test('unknown commands result in no command running and an error logged', function(t) {
    var errorLogged = false;
    var exitCode = 0;
    var args = [ 'unknown' ];
    var cfg = {
        commands: {
            known: function(cmd) {
                return cmd;
            }
        },
        error: function(message) {
            errorLogged = true;
        },
        exit: function(code) {
            exitCode = code;
        }
    };

    commandable(args, cfg)
        .then(function(cmd) {
            t.ok(!cmd);
            t.ok(errorLogged);
            t.ok(exitCode);
            t.end();
        })
    ;
});

test('commands can have aliases', function(t) {
    var args = [ 'cmd' ];
    var cfg = {
        commands: {
            command: {
                alias: 'cmd',
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'command');
        t.end();
    });
});

test('commands can have multiple aliases', function(t) {
    var args = [ 'cmd2' ];
    var cfg = {
        commands: {
            command: {
                alias: [ 'cmd1', 'cmd2' ],
                run: function(cmd) {
                    return cmd;
                }
            }
        }
    };

    commandable(args, cfg).then(function(cmd) {
        t.equal(cmd.cfg.name, 'command');
        t.end();
    });
});

test('argument specs get normalized as an array of objects', function(t) {
    var normal = normalize({
        arguments: '<required> [optional]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'required');
    t.equal(normal.arguments[1].name, 'optional');

    t.end();
});

test('argument specs with dashes get normalized as camelCase', function(t) {
    var normal = normalize({
        arguments: '<required-arg> [optional-arg]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'requiredArg');
    t.equal(normal.arguments[1].name, 'optionalArg');

    t.end();
});

test('arguments specs with spaces get normalized as camelCase', function(t) {
    var normal = normalize({
        arguments: '<required arg> [optional arg]'
    });

    t.equal(normal.arguments.length, 2);
    t.equal(normal.arguments[0].name, 'requiredArg');
    t.equal(normal.arguments[1].name, 'optionalArg');

    t.end();
});

test('options specified as functions use those as their types', function(t) {
    var normal = normalize({
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

test('options with param-case names get normalized as camelCase', function(t) {
    var normal = normalize({
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

test('option aliases get normalized as an array including their param-case variants', function(t) {
    var normal = normalize({
        options: {
            firstOpt: {
                type: String,
                alias: 'firstAlias' // not array
            },
            stringAlias: 'firstOpt', // string instead of object
            secondOpt: {
                alias: [ 'secondAlias', 'thirdAlias' ] // in array
            },
            thirdOpt: {
                // no aliases
            }
        }
    });

    t.deepEqual(Object.keys(normal.options).sort(), [ 'firstOpt', 'secondOpt', 'thirdOpt' ]);
    t.deepEqual(normal.options.firstOpt.alias.sort(), [ 'first-alias', 'first-opt', 'firstAlias', 'string-alias', 'stringAlias' ]);
    t.deepEqual(normal.options.secondOpt.alias.sort(), [ 'second-alias', 'second-opt', 'secondAlias', 'third-alias', 'thirdAlias' ]);
    t.deepEqual(normal.options.thirdOpt.alias.sort(), [ 'third-opt' ]);

    t.end();
});

test('commands specified as functions get normalized as objects', function(t) {
    var normal = normalize({
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

test('configs specified as a function get normalized as an object', function(t) {
    var normal = normalize(function(cmd) {});

    t.equal(typeof normal, 'object');
    t.equal(typeof normal.run, 'function');

    t.end();
});
