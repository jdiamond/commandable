'use strict';

var path = require('path');

var Promise    = require('bluebird');
var changeCase = require('change-case');
var _          = require('lodash');
var minimist   = require('minimist');

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

        if (parsed.help || parsed.h) {
            return help(cfg);
        }

        var proto = sup && sup.opts || Object.prototype;

        var cmd = {
            sup: sup,
            cfg: cfg,
            opts: _.extend(Object.create(proto), _.omit(parsed, '_')),
            args: collectArgs(parsed._, cfg),
            rest: parsed._
        };

        if (parsed._.length) {
            var camelCaseCommandName = changeCase.camelCase(parsed._[0]);

            if (cfg.commands && camelCaseCommandName in cfg.commands) {
                var sub = cfg.commands[camelCaseCommandName];
                sub.log = cfg.log;
                sub.error = cfg.error;
                return resolve(run(parsed._.slice(1), sub, cmd));
            }

            if (!_.isEmpty(cfg.commands) && parsed._.length) {
                var parents = (function sup(cfg) {
                    return cfg.name ? sup(cfg.sup) + ' ' + changeCase.paramCase(cfg.name) : '';
                })(cfg);

                error('Unknown command: %s', (parents + ' ' + parsed._[0]).trim());
                error();
                help(cfg, error);
                return resolve();
            }
        }

        var missing = findMissing(cmd);

        if (missing) {
            error('Missing argument: <%s>', changeCase.paramCase(missing));
            error();
            help(cfg, error);
            return resolve();
        }

        if (cfg.callback || cfg.run) {
            var inits = [];

            (function init(cfg) {
                if (cfg.sup) {
                    init(cfg.sup);
                }

                if (cfg.init) {
                    inits.push(function() {
                        return cfg.init(cmd);
                    });
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
                resolve(Promise
                    .each(inits, function(init) { return init(); })
                    .then(function() { return cfg.run(cmd); })
                );
            }
        } else {
            help(cfg);
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
        ? _.map(parseArgs(cfg.arguments), function(arg) {
            return {
                name: arg.slice(1, -1),
                type: String,
                required: arg.charAt(0) === '<'
            };
        })
        : cfg.arguments || []
    ;

    cfg.arguments.forEach(function(arg) {
        arg.name = changeCase.camelCase(arg.name);
    });

    var opts = _.mapValues(cfg.options || {}, function(val, key) {
        if (typeof val === 'function') {
            return { type: val };
        } else {
            return val;
        }
    });

    cfg.options = {};

    Object.keys(opts).forEach(function(key) {
        cfg.options[changeCase.camelCase(key)] = opts[key];
    });

    var cmds = _(cfg.commands || {})
        .mapValues(function(sub, name) {
            sub = normalize(sub);

            sub.name = name;
            sub.sup = cfg;

            return sub;
        })
        .value()
    ;

    cfg.commands = {};

    Object.keys(cmds).forEach(function(key) {
        cfg.commands[changeCase.camelCase(key)] = cmds[key];
    });

    return cfg;

    function parseArgs(args) {
        var re = /((\<.+?\>)|(\[.+?\]))/g;
        var match;
        var results = [];

        while ((match = re.exec(args))) {
            results.push(match[1]);
        }

        return results;
    }
}

function parse(argv, cfg) {
    cfg.stopEarly = true;

    var mergedOptions = (function mergeOptions(cfg, options) {
        options = _.extend(options, cfg.options);
        return cfg.sup ? mergeOptions(cfg.sup, options) : options;
    })(cfg, { h: 'help', help: { type: Boolean } });

    cfg.alias = cfg.alias || {};

    Object.keys(mergedOptions).forEach(function(key) {
        var paramCase = changeCase.paramCase(key);
        var camelCase = _.isString(mergedOptions[key]) ? changeCase.camelCase(mergedOptions[key]) : key;

        if (paramCase !== camelCase) {
            cfg.alias[paramCase] = camelCase;
        }
    });

    cfg.boolean = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // only include boolean options
        return type === Boolean;
    }).pluck(0).map(changeCase.paramCase).value();

    cfg.string = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        return type !== Boolean && type !== Number;
    }).pluck(0).map(changeCase.paramCase).value();

    var unknown;

    if (!_.isEmpty(_.omit(mergedOptions, [ 'h', 'help' ]))) {
        cfg.unknown = function(name) {
            // arguments also get passed to unknown
            if (name.charAt(0) === '-') {
                if (!unknown) {
                    var camelCase = changeCase.camelCase(name.replace(/^-+/, ''));

                    if (!cfg.options[camelCase]) {
                        unknown = name;

                        return false;
                    }
                }
            }
        };
    }

    var parsed = minimist(argv, cfg);

    if (unknown) {
        return {
            unknown: unknown
        };
    }

    var renamed = {};

    Object.keys(parsed).forEach(function(key) {
        if (key !== '_') {
            renamed[changeCase.camelCase(key)] = parsed[key];
        }
    });

    renamed._ = parsed._;
    parsed = renamed;

    return parsed;
}

function collectArgs(args, cfg) {
    return _(cfg.arguments)
        .map(function(arg, i) {
            return [ changeCase.camelCase(arg.name), args[i] ];
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
