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

        if (parsed.help || parsed.h) {
            return help(cfg);
        }

        var proto = sup && sup.opts || Object.prototype;

        var parsedArgs = parseArgs(parsed._, cfg);

        var cmd = {
            sup: sup,
            cfg: cfg,
            opts: _.extend(Object.create(proto), _.omit(parsed, '_')),
            argv: parsed._,
            args: parsedArgs.named,
            rest: parsedArgs.rest
        };

        if (parsed._.length) {
            if (!_.isEmpty(cfg.commands)) {
                var commandName = changeCase.camelCase(parsed._[0]);

                if (!cfg.commands[commandName]) {
                    var parents = (function sup(cfg) {
                        return cfg.name ? sup(cfg.sup) + ' ' + changeCase.paramCase(cfg.name) : '';
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

        var missing = findFirstMissingArg(cmd);

        if (missing) {
            error('Missing argument: %s', changeCase.paramCase(missing));
            error();

            help(cfg, error);

            return exit(1);
        }

        if (!cfg.run) {
            help(cfg, error);

            return exit(1);
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

        function parseArgs(args, cfg) {
            var count = 0;
            var named = _(cfg.arguments)
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
                .zipObject()
                .value()
            ;

            return {
                named: named,
                rest: args.slice(count)
            };
        }

        function findFirstMissingArg(cmd) {
            return cmd.cfg.arguments.reduce(function(missing, arg) {
                return missing || (arg.required && !cmd.args[arg.name] && arg.name);
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
