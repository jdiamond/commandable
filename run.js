'use strict';

var Promise    = require('bluebird');
var changeCase = require('change-case');
var _          = require('lodash');

var help = require('./help');
var normalize = require('./normalize');
var parse = require('./parse');

module.exports = run;

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
