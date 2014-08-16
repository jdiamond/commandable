#!/usr/bin/env node

var Promise = require('bluebird');
var test = require('tape');

var commandable = require('./commandable');

var opts = {
    run: function(opts) {
        return {
            cmd: 'none',
            opts: opts
        };
    },
    commands: {
        fn: function(opts) {
            return {
                cmd: 'fn',
                opts: opts
            };
        },
        fn2: function(opts, callback) {
            callback(null, {
                cmd: 'fn2',
                opts: opts
            });
        },
        obj: {
            run: function(opts) {
                return {
                    cmd: 'obj',
                    opts: opts
                };
            }
        },
        obj2: {
            callback: function(opts, callback) {
                callback(null, {
                    cmd: 'obj2',
                    opts: opts
                });
            }
        },
        sub: {
            run: function(opts) {
                return {
                    cmd: 'sub',
                    opts: opts
                };
            },
            commands: {
                sub2: function(opts) {
                    return {
                        cmd: 'sub2',
                        opts: opts
                    };
                }
            }
        },
        err: function(opts) {
            return Promise.reject(new Error('err'));
        },
        err2: function(opts, callback) {
            callback(new Error('err2'));
        },
        throw: function(opts) {
            throw new Error('throw');
        }
    }
};

test('fn', function(t) {
    commandable([ '-a', 'b', 'fn', '-c', 'd' ], opts).then(function(result) {
        t.equal(result.cmd, 'fn');
        t.equal(result.opts.$parent.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('fn2', function(t) {
    commandable([ '-a', 'b', 'fn2', '-c', 'd' ], opts, function(err, result) {
        t.equal(result.cmd, 'fn2');
        t.equal(result.opts.$parent.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('obj', function(t) {
    commandable([ '-a', 'b', 'obj', '-c', 'd' ], opts).then(function(result) {
        t.equal(result.cmd, 'obj');
        t.equal(result.opts.$parent.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('obj2', function(t) {
    commandable([ '-a', 'b', 'obj2', '-c', 'd' ], opts, function(err, result) {
        t.equal(result.cmd, 'obj2');
        t.equal(result.opts.$parent.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('sub', function(t) {
    commandable([ '-a', 'b', 'sub', '-c', 'd' ], opts).then(function(result) {
        t.equal(result.cmd, 'sub');
        t.equal(result.opts.$parent.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('sub2', function(t) {
    commandable([ '-a', 'b', 'sub', '-c', 'd', 'sub2', '-e', 'f' ], opts).then(function(result) {
        t.equal(result.cmd, 'sub2');
        t.equal(result.opts.$parent.$parent.a, 'b');
        t.equal(result.opts.$parent.c, 'd');
        t.equal(result.opts.e, 'f');
        t.end();
    });
});

test('none', function(t) {
    commandable([ '-a', 'b', '-c', 'd' ], opts).then(function(result) {
        t.equal(result.cmd, 'none');
        t.equal(result.opts.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('callback', function(t) {
    commandable([ '-a', 'b', '-c', 'd' ], opts, function(err, result) {
        t.equal(result.cmd, 'none');
        t.equal(result.opts.a, 'b');
        t.equal(result.opts.c, 'd');
        t.end();
    });
});

test('err', function(t) {
    commandable([ '-a', 'b', 'err', '-c', 'd' ], opts).catch(function(err) {
        t.equal(err.message, 'err');
        t.end();
    });
});

test('err2', function(t) {
    commandable([ '-a', 'b', 'err2', '-c', 'd' ], opts, function(err) {
        t.equal(err.message, 'err2');
        t.end();
    });
});

test('throw', function(t) {
    commandable([ '-a', 'b', 'throw', '-c', 'd' ], opts).catch(function(err) {
        t.equal(err.message, 'throw');
        t.end();
    });
});
