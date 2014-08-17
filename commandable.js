var path = require('path');
var minimist = require('minimist');
var Promise = require('bluebird');
var _ = require('lodash');

var help = require('./help');

module.exports = run;

// bash completions?

function run(argv, cmd, callback) {
    if (!Array.isArray(argv)) {
        callback = cmd;
        cmd = argv;
        argv = null;
    }

    return new Promise(function(resolve, reject) {
        argv = argv || process.argv.slice(2);
        cmd = cmd || {};

        cmd.stopEarly = true;

        cmd.alias = _.extend(cmd.alias || {}, _(cmd.options).pick(_.isString).value());
        // TODO: populate boolean and string options?
        // support other types like dates and arrays?

        var opts = minimist(argv, cmd);

        cmd.arguments = parseArgs(cmd, opts);

        var ctx = {
            cmd: cmd,
            args: collectArgs(cmd, opts),
            opts: opts,
            sup: cmd.sup
        };

        if (opts.help || opts.h) {
            help(cmd);
        } else if (cmd.commands && opts._.length && opts._[0] in cmd.commands) {
            var sub = cmd.commands[opts._[0]];

            if (typeof sub === 'function') {
                var fn = sub;
                sub = {};
                sub[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            sub.name = opts._[0];
            sub.sup = opts;

            resolve(run(opts._.slice(1), sub));
        } else {
            // where to check for unknown commands?

            var missing = firstMissing(ctx);

            if (missing) {
                console.error('Missing: <%s>', missing);
                console.error();
                help(cmd);
                resolve(); // notify error?
            } else if (cmd.callback) {
                cmd.callback(ctx, function(err, result) {
                    if (err) reject(err);
                    else     resolve(result);
                });
            } else if (cmd.run) {
                resolve(cmd.run(ctx));
            } else {
                help(cmd);
            }
        }
    }).nodeify(callback);
}

function parseArgs(cmd, opts) {
    return typeof cmd.arguments === 'string'
        ? _.map(cmd.arguments.split(' '), function(arg) {
            return {
                name: arg.slice(1, -1),
                type: String,
                required: arg.charAt(0) === '<'
            };
        })
        : cmd.arguments || []
    ;
}

function collectArgs(cmd, opts) {
    return _(cmd.arguments)
        .map(function(arg, i) {
            return [ arg.name || i, opts._[i] ];
        })
        .zipObject()
        .extend({ _: opts._ })
        .value()
    ;
};

function firstMissing(ctx) {
    return ctx.cmd.arguments.reduce(function(missing, arg) {
        return missing || (arg.required && !ctx.args[arg.name] && arg.name);
    }, null);
}
