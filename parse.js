'use strict';

var changeCase = require('change-case');
var _          = require('lodash');
var minimist   = require('minimist');

module.exports = parse;

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
