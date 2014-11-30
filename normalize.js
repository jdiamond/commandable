'use strict';

var changeCase = require('change-case');
var _          = require('lodash');

module.exports = normalize;

function normalize(cfg) {
    if (typeof cfg === 'function') {
        cfg = { run: cfg };
    }

    cfg.arguments =
        typeof cfg.arguments === 'string'
        ? _.map(parseArgs(cfg.arguments), function(arg) {
            return {
                name: arg.slice(1, -1).replace(/\.\.\.$/, ''),
                type: String,
                required: arg.charAt(0) === '<',
                multi: arg.slice(-4, -1) === '...'
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
