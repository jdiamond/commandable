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
    normalize(cfg);

    var error = cfg.error || console.error;
    var exit = cfg.exit || process.exit;

    return Promise.try(function() {
        var parsed = parse(argv, cfg);

        if (parsed.unknown) {
            error('Unknown option: %s', parsed.unknown);
            error();
            return help(cfg, error);
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
                sub.exit = cfg.exit;
                return run(parsed._.slice(1), sub, cmd);
            }

            if (!_.isEmpty(cfg.commands) && parsed._.length) {
                var parents = (function sup(cfg) {
                    return cfg.name ? sup(cfg.sup) + ' ' + changeCase.paramCase(cfg.name) : '';
                })(cfg);

                error('Unknown command: %s', (parents + ' ' + parsed._[0]).trim());
                error();

                return help(cfg, error);
            }
        }

        var missing = findMissing(cmd);

        if (missing) {
            error('Missing argument: <%s>', changeCase.paramCase(missing));
            error();

            return help(cfg, error);
        }

        if (!cfg.run) {
            return help(cfg);
        }

        var inits = [];

        (function init(cfg) {
            if (cfg.sup) {
                init(cfg.sup);
            }

            if (cfg.init) {
                inits.push(function() {
                    if (cfg.init.length === 2) {
                        return Promise.promisify(cfg.init)(cmd);
                    } else {
                        return cfg.init(cmd);
                    }
                });
            }
        })(cfg);

        return Promise
            .each(inits, function(init) { return init(); })
            .then(function() {
                if (cfg.run.length === 2) {
                    return Promise.promisify(cfg.run)(cmd);
                } else {
                    return cfg.run(cmd);
                }
            })
        ;

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
    }).catch(function(err) {
        var message = err && err.message || err;
        error('Error: ' + message);
        return exit(1);
    });
}

function normalize(cfg) {
    if (typeof cfg === 'function') {
        cfg = { run: cfg };
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

    Object.keys(cfg.options).forEach(function(key) {
        var opt = cfg.options[key];

        if (!opt || typeof opt === 'string') {
            return;
        } else if (!opt.alias) {
            opt.alias = [];
        } else if (typeof opt.alias === 'string') {
            opt.alias = [ opt.alias ];
        }
    });

    Object.keys(cfg.options).forEach(function(key) {
        if (typeof cfg.options[key] === 'string') {
            var opt = cfg.options[changeCase.camelCase(cfg.options[key])];

            if (opt) {
                opt.alias.push(key);
            }

            delete cfg.options[key];
        }
    });

    Object.keys(cfg.options).forEach(function(key) {
        var opt = cfg.options[key];

        var aliases = {};

        aliases[changeCase.camelCase(key)] = true;
        aliases[changeCase.paramCase(key)] = true;

        opt.alias.forEach(function(alias) {
            aliases[changeCase.camelCase(alias)] = true;
            aliases[changeCase.paramCase(alias)] = true;
        });

        opt.alias = _(aliases).omit(key).keys().value();
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
    })(cfg, { help: { type: Boolean, alias: [ 'h' ] } });

    cfg.alias = cfg.alias || {};

    Object.keys(mergedOptions).forEach(function(key) {
        var aliases = [ key ].concat(mergedOptions[key].alias || []);

        aliases.forEach(function(alias) {
            var camelCase = changeCase.camelCase(alias);
            var paramCase = changeCase.paramCase(alias);

            if (paramCase !== camelCase) {
                cfg.alias[paramCase] = key;
            }
        });
    });

    cfg.boolean = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // only include boolean options
        return type === Boolean;
    }).pluck(0).value();

    cfg.string = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // exclude aliases, booleans, and numbers
        return typeof type !== 'string' && type !== Boolean && type !== Number;
    }).pluck(0).value();

    cfg.default = cfg.default || {};

    Object.keys(mergedOptions).forEach(function(key) {
        if (mergedOptions[key].default) {
            cfg.default[key] = mergedOptions[key].default;
        }
    });

    var unknown;

    if (!_.isEmpty(_.omit(mergedOptions, [ 'help' ]))) {
        cfg.unknown = function(name) {
            // arguments also get passed to unknown
            if (name.charAt(0) === '-' && name.length > 1) {
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

    Object.keys(parsed).forEach(function(key) {
        if (key !== '_') {
            parsed[changeCase.camelCase(key)] =
            parsed[changeCase.paramCase(key)] = parsed[key];

            var opt = mergedOptions[changeCase.camelCase(key)];

            if (opt) {
                opt.alias.forEach(function(alias) {
                    parsed[changeCase.camelCase(alias)] =
                    parsed[changeCase.paramCase(alias)] = parsed[key];
                });
            }
        }
    });

    return parsed;
}
