var path = require('path');

var Promise  = require('bluebird');
var _        = require('lodash');
var minimist = require('minimist');

var help = require('./help');

module.exports = main;

function main(argv, cfg, callback) {
    if (!Array.isArray(argv)) {
        callback = cfg;
        cfg = argv;
        argv = null;
    }

    argv = (argv || process.argv).slice(2);
    cfg = cfg || {};

    return run(argv, cfg).nodeify(callback);
}

function run(argv, cfg, sup) {
    return new Promise(function(resolve, reject) {
        normalize(cfg);

        var parsed = parse(argv, cfg);

        var proto = sup && sup.opts || Object.prototype;

        var cmd = {
            sup: sup,
            cfg: cfg,
            opts: _.extend(Object.create(proto), _.omit(parsed, '_')),
            args: collectArgs(parsed._, cfg),
            rest: parsed._
        };

        if (parsed.help || parsed.h) {
            help(cfg);
        } else if (cfg.commands && parsed._.length && parsed._[0] in cfg.commands) {
            var sub = cfg.commands[parsed._[0]];

            // this should be in normalize
            if (typeof sub === 'function') {
                var fn = sub;
                sub = {};
                sub[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            sub.name = parsed._[0];
            sub.sup = cfg;

            resolve(run(parsed._.slice(1), sub, cmd));
        } else {
            // where to check for unknown commands?

            var missing = findMissing(cmd);

            if (missing) {
                console.error('Missing: <%s>', missing);
                console.error();
                help(cfg);
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
    });
}

function normalize(cfg) {
    cfg.arguments =
        typeof cfg.arguments === 'string'
        ? _.map(cfg.arguments.split(' '), function(arg) {
            return {
                name: arg.slice(1, -1),
                type: String,
                required: arg.charAt(0) === '<'
            };
        })
        : cfg.arguments || []
    ;

    cfg.commands = _(cfg.commands || {})
        .mapValues(function(sub, name) {
            if (typeof sub === 'function') {
                var fn = sub;
                sub = {};
                sub[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            sub.name = name;
            sub.sup = cfg;

            return sub;
        })
        .value()
    ;
}

function parse(argv, cfg) {
    cfg.stopEarly = true;

    cfg.alias = _.extend(cfg.alias || {}, _(cfg.options).pick(_.isString).value());

    cfg.boolean = _(cfg.options).pairs().filter(function(pair) {
        return pair[1] === Boolean || pair[1].type === Boolean;
    }).pluck(0).value();

    cfg.string = _(cfg.options).pairs().filter(function(pair) {
        return pair[1] === String || pair[1].type === String;
    }).pluck(0).value();

    return minimist(argv, cfg);
}

function collectArgs(args, cfg) {
    return _(cfg.arguments)
        .map(function(arg, i) {
            return [ arg.name || i, args[i] ];
        })
        .zipObject()
        .value()
    ;
};

function findMissing(cmd) {
    return cmd.cfg.arguments.reduce(function(missing, arg) {
        return missing || (arg.required && !cmd.args[arg.name] && arg.name);
    }, null);
}
