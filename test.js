#!/usr/bin/env node

var Promise = require('bluebird');
var test = require('tape');

var commandable = require('./commandable');

var cfg = {
    run: function(cmd) {
        return cmd;
    },
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
        }
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
