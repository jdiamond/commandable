'use strict';

var changeCase = require('change-case');
var _          = require('lodash');
var minimist   = require('minimist');

module.exports = parse;

function parse(argv, cfg) {
    var minCfg = {};

    minCfg.stopEarly = true;

    var mergedOptions = (function mergeOptions(c, options) {
        options = _.extend(options, c.options);
        return c.sup ? mergeOptions(c.sup, options) : options;
    })(cfg, { help: { type: Boolean, alias: [ 'h' ] } });

    minCfg.alias = typeof cfg.alias === 'object' ? cfg.alias : {};

    Object.keys(mergedOptions).forEach(function(key) {
        var aliases = [ key ].concat(mergedOptions[key].alias || []);

        aliases.forEach(function(alias) {
            if (alias.length === 1) {
                minCfg.alias[alias] = key;
            } else {
                var camelCase = changeCase.camelCase(alias);
                var paramCase = changeCase.paramCase(alias);

                if (camelCase !== key) {
                    minCfg.alias[camelCase] = key;
                }

                if (paramCase !== key) {
                    minCfg.alias[paramCase] = key;
                }
            }
        });
    });

    minCfg.boolean = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // only include boolean options
        return type === Boolean;
    }).pluck(0).value();

    minCfg.string = _(mergedOptions).pairs().filter(function(pair) {
        var type = pair[1] && pair[1].type || pair[1];
        // exclude aliases, booleans, and numbers
        return typeof type !== 'string' && type !== Boolean && type !== Number;
    }).pluck(0).value();

    minCfg.default = cfg.default || {};

    Object.keys(mergedOptions).forEach(function(key) {
        var opt = mergedOptions[key];

        if (opt.default && !opt.env) {
            minCfg.default[key] = mergedOptions[key].default;
        }
    });

    var unknown;

    if (!cfg.unknown && !_.isEmpty(_.omit(mergedOptions, [ 'help' ]))) {
        minCfg.unknown = function(name) {
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

    var parsed = minimist(argv, minCfg);

    if (unknown) {
        return {
            unknown: unknown
        };
    }

    var foundOpts = {};
    var env = cfg.env || process.env;

    Object.keys(parsed).forEach(function(key) {
        foundOpts[changeCase.camelCase(key)] = true;
    });

    Object.keys(mergedOptions).forEach(function(key) {
        if (!foundOpts[key]) {
            var opt = mergedOptions[key];

            if (opt.env) {
                var val = typeof env === 'function' ? env(opt.env) : env[opt.env];

                if (val) {
                    parsed[key] = val;

                    return;
                }
            }

            if (opt.default) {
                parsed[key] = opt.default;
            }
        }
    });

    Object.keys(parsed).forEach(function(key) {
        if (key !== '_') {
            if (key.length > 1) {
                parsed[changeCase.camelCase(key)] =
                parsed[changeCase.paramCase(key)] = parsed[key];
            }

            var opt = mergedOptions[changeCase.camelCase(key)];

            if (opt) {
                opt.alias.forEach(function(alias) {
                    if (alias.length === 1) {
                        parsed[alias] = parsed[key];
                    } else {
                        parsed[changeCase.camelCase(alias)] =
                        parsed[changeCase.paramCase(alias)] = parsed[key];
                    }
                });
            }
        }
    });

    return parsed;
}
