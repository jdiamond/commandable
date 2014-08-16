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

        var cmd = {
            cfg: cfg,
            args: getArgs(cfg, opts),
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
                console.error('Missing required argument: "%s"', missing);
                console.error();
                cmd.$help();
                resolve();
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

function getArgs(cfg, opts) {
    if (typeof cfg.arguments === 'string') {
        cfg.arguments = _(cfg.arguments.split(' '))
            .map(function(arg) {
                return {
                    name: arg.slice(1, -1),
                    type: String,
                    required: arg.charAt(0) === '<'
                };
            })
            .value()
        ;
    }

    cfg.arguments = cfg.arguments || [];

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
    // reduce?
    var missing = null;
    cmd.cfg.arguments.forEach(function(arg, i) {
        if (!missing && cmd.cfg.arguments[i].required) {
            if (!cmd.args[i]) {
                missing = cmd.cfg.arguments[i].name;
            }
        }
    });
    return missing;
}
