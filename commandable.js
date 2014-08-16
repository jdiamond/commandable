var path = require('path');
var minimist = require('minimist');
var Promise = require('bluebird');
var _ = require('lodash');

var help = require('./help');

module.exports = run;

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

        var opts = minimist(args, cfg);

        opts.$parent = cfg.$parent;
        opts.$cfg = cfg;
        opts.$help = help.bind(null, opts);

        if (opts.help || opts.h) {
            help(opts, cfg);
        } else if (cfg.commands && opts._.length && opts._[0] in cfg.commands) {
            var cmd = cfg.commands[opts._[0]];

            if (typeof cmd === 'function') {
                var fn = cmd;
                cmd = {};
                cmd[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            cmd.name = opts._[0];
            cmd.$parent = opts;

            resolve(run(opts._.slice(1), cmd));
        } else if (cfg.callback) {
            cfg.callback(opts, function(err, result) {
                if (err) reject(err);
                else     resolve(result);
            });
        } else if (cfg.run) {
            resolve(cfg.run(opts));
        } else {
            help(opts, cfg);
        }
    }).nodeify(callback);
}
