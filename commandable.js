var path = require('path');
var minimist = require('minimist');
var Promise = require('bluebird');
var _ = require('lodash');

var help = require('./help');

module.exports = run;

// bash completions?

function run(args, cfg, callback) {
    if (!Array.isArray(args)) {
        callback = cfg;
        cfg = args;
        args = null;
    }

    return new Promise(function(resolve, reject) {
        args = args || process.argv.slice(2);
        cfg = cfg || {};

        cfg.stopEarly = true;

        cfg.alias = _.extend(cfg.alias || {}, _(cfg.options).pick(_.isString).value());
        // TODO: populate boolean and string options?
        // support other types like dates and arrays?

        var opts = minimist(args, cfg);

        cfg.arguments = parseArgs(cfg, opts);

        var cmd = {
            cfg: cfg,
            args: collectArgs(cfg, opts),
            opts: opts,
            $parent: cfg.$parent,
            $help: help.bind(null, cfg)
        };

        if (opts.help || opts.h) {
            help(cfg);
        } else if (cfg.commands && opts._.length && opts._[0] in cfg.commands) {
            var sub = cfg.commands[opts._[0]];

            if (typeof sub === 'function') {
                var fn = sub;
                sub = {};
                sub[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            sub.name = opts._[0];
            sub.$parent = opts;

            resolve(run(opts._.slice(1), sub));
        } else {
            // where to check for unknown commands?

            var missing = firstMissing(cmd);

            if (missing) {
                console.error('Missing: <%s>', missing);
                console.error();
                cmd.$help();
                resolve(); // notify error?
            } else if (cfg.callback) {
                cfg.callback(cmd, function(err, result) {
                    if (err) reject(err);
                    else     resolve(result);
                });
            } else if (cfg.run) {
                resolve(cfg.run(cmd));
            } else {
                help(cfg);
            }
        }
    }).nodeify(callback);
}

function parseArgs(cfg, opts) {
    return typeof cfg.arguments === 'string'
        ? _.map(cfg.arguments.split(' '), function(arg) {
            return {
                name: arg.slice(1, -1),
                type: String,
                required: arg.charAt(0) === '<'
            };
        })
        : cfg.arguments || []
    ;
}

function collectArgs(cfg, opts) {
    return _(cfg.arguments)
        .map(function(arg, i) {
            return [ arg.name || i, opts._[i] ];
        })
        .zipObject()
        .extend({ _: opts._ })
        .value()
    ;
};

function firstMissing(cmd) {
    return cmd.cfg.arguments.reduce(function(missing, arg) {
        return !missing && arg.required && !cmd.args[arg.name] && arg.name;
    }, null);
}
