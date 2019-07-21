'use strict';

var Promise    = require('bluebird');
var changeCase = require('change-case');
var _          = require('lodash');

var help       = require('./help');
var normalize  = require('./normalize');
var parse      = require('./parse');

module.exports = run;

function run(argv, cfg, sup) {
    cfg = normalize(cfg);

    var error = cfg.error || console.error;
    var exit = cfg.exit || process.exit;

    return Promise.try(function() {
        var parsed = parse(argv, cfg);

        if (parsed.unknown) {
            error('Unknown option: %s', parsed.unknown);
            error();

            help(cfg, error);

            return exit(1);
        }

        if (parsed.help) {
            return help(cfg);
        }

        var proto = sup && sup.opts || Object.prototype;

        var cmd = {
            sup: sup,
            cfg: cfg,
            opts: _.extend(Object.create(proto), _.omit(parsed, '_')),
            argv: parsed._,
            args: {},
            rest: []
        };

        if (parsed._.length) {
            if (!_.isEmpty(cfg.commands)) {
                var aliases = _.fromPairs(_(cfg.commands)
                    .toPairs()
                    .filter(function(pair) {
                        return Array.isArray(pair[1].alias);
                    })
                    .reduce(function(arr, pair) {
                        return arr.concat(
                            pair[1].alias.map(function(alias) {
                                return [ changeCase.camelCase(alias), changeCase.camelCase(pair[0]) ];
                            })
                        );
                    }, []))
                ;

                var commandName = changeCase.camelCase(parsed._[0]);

                commandName = aliases[commandName] || commandName;

                if (!cfg.commands[commandName]) {
                    var parents = (function getSuper(c) {
                        return c.name ? getSuper(c.sup) + ' ' + changeCase.paramCase(c.name) : '';
                    })(cfg);

                    error('Unknown command: %s', (parents + ' ' + parsed._[0]).trim());
                    error();

                    help(cfg, error);

                    return exit(1);
                }

                var sub = cfg.commands[commandName];

                // move some of the super command config down to the sub command config
                sub.env = cfg.env;
                sub.log = cfg.log;
                sub.error = cfg.error;
                sub.exit = cfg.exit;

                return run(parsed._.slice(1), sub, cmd);
            }
        }

        var parsedArgs = parseArgs(parsed._, cfg);

        cmd.args = parsedArgs.named;
        cmd.rest = parsedArgs.rest;

        var firstMissing = findFirstMissingArg(cmd);

        if (firstMissing) {
            error('Missing argument: %s', changeCase.paramCase(firstMissing));
            error();

            help(cfg, error);

            return exit(1);
        }

        if (!cfg.run) {
            help(cfg, error);

            return exit(1);
        }

        var inits = [];

        (function init(c) {
            if (c.sup) {
                init(c.sup);
            }

            if (c.init) {
                inits.push(function() {
                    if (c.init.length === 2) {
                        return Promise.promisify(c.init)(cmd);
                    } else {
                        return c.init(cmd);
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

        function parseArgs(args, c) {
            var count = 0;
            var named = _(c.arguments)
                .map(function(arg, i) {
                    if (i < args.length) {
                        count++;

                        if (arg.multi) {
                            return [ changeCase.camelCase(arg.name), args.slice(i) ];
                        }

                        return [ changeCase.camelCase(arg.name), args[i] ];
                    }
                })
                .filter()
                .fromPairs()
                .value()
            ;

            _(c.arguments)
                .filter(function(arg) {
                    return arg.multi;
                })
                .each(function(arg) {
                    var name = changeCase.camelCase(arg.name);
                    named[name] = named[name] || [];
                })
            ;

            return {
                named: named,
                rest: args.slice(count)
            };
        }

        function findFirstMissingArg(c) {
            return c.cfg.arguments.reduce(function(missing, arg) {
                if (missing) { return missing; }
                if (!arg.required) { return false; }
                var val = c.args[changeCase.camelCase(arg.name)];
                if (!val || (arg.multi && !val.length)) { return arg.name; }
                return false;
            }, null);
        }
    }).catch(function(err) {
        var message = err && err.message || err;
        error('Error: ' + message);

        if (process.env.DEBUG && err.stack) {
            error(err.stack);
        }

        return exit(1);
    });
}
