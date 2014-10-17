'use strict';

var path = require('path');

var Promise  = require('bluebird');
var _        = require('lodash');
var minimist = require('minimist');

var help = require('./help');

module.exports = main;

module.exports.normalize = normalize; // for testing

function main(argv, cfg, callback) {
    if (!Array.isArray(argv)) {
        callback = cfg;
        cfg = argv;
        argv = null;
    }

    argv = argv || process.argv.slice(2);
    cfg = cfg || {};

    return run(argv, cfg).nodeify(callback);
}

function run(argv, cfg, sup) {
    return new Promise(function(resolve, reject) {
        var error = cfg.error || console.error;

        normalize(cfg);

        var parsed = parse(argv, cfg);

        if (parsed.unknown) {
            error('Unknown option: %s', parsed.unknown);
            error();
            help(cfg, error);
            return resolve();
        }

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
            sub.log = cfg.log;
            sub.error = cfg.error;
            resolve(run(parsed._.slice(1), sub, cmd));
        } else {
            if (!_.isEmpty(cfg.commands) && parsed._.length) {
                var parents = (function sup(cfg) {
                    return cfg.name ? sup(cfg.sup) + ' ' + cfg.name : '';
                })(cfg);

                error('Unknown command: %s', (parents + ' ' + parsed._[0]).trim());
                error();
                help(cfg, error);
                return resolve();
            }

            var missing = findMissing(cmd);

            if (missing) {
                error('Missing argument: <%s>', missing);
                error();
                help(cfg, error);
                return resolve();
            }

            if (cfg.callback || cfg.run) {
                (function init(cfg) {
                    if (cfg.sup) {
                        init(cfg.sup);
                    }

                    if (cfg.init) {
                        cfg.init(cmd);
                    }
                })(cfg);

                if (cfg.callback) {
                    cfg.callback(cmd, function(err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                } else if (cfg.run) {
                    resolve(cfg.run(cmd));
                }
            } else {
                help(cfg);
            }
        }
    });
}

function normalize(cfg) {
    if (typeof cfg === 'function') {
        var fn = cfg;
        cfg = {};
        cfg[fn.length === 2 ? 'callback' : 'run'] = fn;
    }

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

    cfg.options = _.mapValues(cfg.options || {}, function(val, key) {
        if (typeof val === 'function') {
            return { type: val };
        } else {
            return val;
        }
    });

    cfg.commands = _(cfg.commands || {})
        .mapValues(function(sub, name) {
            sub = normalize(sub);

            sub.name = name;
            sub.sup = cfg;

            return sub;
        })
        .value()
    ;

    return cfg;
}

function parse(argv, cfg) {
    cfg.stopEarly = true;

    var mergedOptions = (function mergeOptions(cfg, options) {
        options = _.extend(options, cfg.options);
        return cfg.sup ? mergeOptions(cfg.sup, options) : options;
    })(cfg, { h: 'help', help: { type: Boolean } });

    cfg.alias = _.extend(cfg.alias || {}, _(mergedOptions).pick(_.isString).value());

    cfg.boolean = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // only include boolean options
        return type === Boolean;
    }).pluck(0).value();

    cfg.string = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // remove boolean options and aliases
        return type !== Boolean && typeof type !== 'string';
    }).pluck(0).value();

    var unknown;

    if (!_.isEmpty(_.omit(mergedOptions, [ 'h', 'help' ]))) {
        cfg.unknown = function(name) {
            // arguments also get passed to unknown
            if (name.charAt(0) === '-') {
                if (!unknown) {
                    unknown = name;
                }

                return false;
            }
        };
    }

    var parsed = minimist(argv, cfg);

    if (unknown) {
        return {
            unknown: unknown
        };
    }

    // convert strings to numbers
    _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        return type === Number;
    }).pluck(0).forEach(function(num) {
        if (parsed[num]) {
            parsed[num] = Number(parsed[num]);
        }
    });

    return parsed;
}

function collectArgs(args, cfg) {
    return _(cfg.arguments)
        .map(function(arg, i) {
            return [ arg.name || i, args[i] ];
        })
        .zipObject()
        .value()
    ;
}

function findMissing(cmd) {
    return cmd.cfg.arguments.reduce(function(missing, arg) {
        return missing || (arg.required && !cmd.args[arg.name] && arg.name);
    }, null);
}
