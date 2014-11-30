'use strict';

var path = require('path');

var changeCase = require('change-case');
var columnify = require('columnify');
var _ = require('lodash');

module.exports = help;

function help(cfg, log) {
    var options = getOptions(cfg);
    var args = getArguments(cfg);
    var commands = getCommands(cfg);
    var usage = getUsage(cfg, options, commands);

    log = log || cfg.log || console.log;

    outputUsage(usage, log);
    outputOptions(options, log);
    outputArguments(args, log);
    outputCommands(commands, log);

    log();
}

function getUsage(cfg, options, commands) {
    var usage = (function sup(cfg) {
        return cfg.name ? sup(cfg.sup) + ' ' + changeCase.paramCase(cfg.name) : '';
    })(cfg);

    if (options.length) {
        usage += ' [options]';
    }

    if (cfg.arguments && cfg.arguments.length) {
        usage += ' ' + _(cfg.arguments).map(function(arg) {
            return arg.required
                ? '<' + changeCase.paramCase(arg.name) + '>'
                : '[' + changeCase.paramCase(arg.name) + ']'
            ;
        }).value().join(' ');
    }

    if (commands.length) {
        usage += cfg.run ? ' [command]' : ' <command>';
    }

    if (cfg.usage) {
        usage += ' ' + cfg.usage;
    }

    return usage.trim();
}

function getOptions(cfg) {
    var options = cfg.options || {};

    (function mergeParentOptions(cfg) {
        if (cfg) {
            options = _.extend(options, cfg.options || {});
            mergeParentOptions(cfg.sup);
        }
    })(cfg.sup);

    var aliases = _(cfg.alias || {})
        .defaults(_.pick(options, _.isString))
        .defaults({ h: 'help' })
        .pairs()
        .groupBy(1)
        .mapValues(function(pairs) { return _.pluck(pairs, 0); })
        .value()
    ;

    return _(options)
        .defaults({ help: { help: 'show help output' } })
        .omit(_.isString)
        .pairs()
        .sortBy(function(pair) {
            return pair[0].toLowerCase();
        })
        .map(function(pair) {
            return {
                name: pair[0],
                names: joinNames(pair[0]),
                help: pair[1].help
            };
        })
        .value()
    ;

    function joinNames(name) {
        var names = (aliases[name] || []);

        var paramCase = changeCase.paramCase(name);

        if (names.indexOf(paramCase) === -1) {
            names.push(paramCase);
        }

        var opts = _.groupBy(names, function(name) {
            return name.length === 1 ? 'short' : 'long';
        });

        var short = opts.short && opts.short.map(function(opt) { return '-' + opt; }) || [];
        var long = opts.long && opts.long.map(function(opt) { return '--' + opt; }) || [];

        return short.sort().concat(long.sort()).join(', ');
    }
}

function getArguments(cfg) {
    return _(cfg.arguments)
        .map(function(arg) {
            if (arg.help) {
                return {
                    name: arg.name,
                    help: arg.help
                };
            }
        })
        .filter()
        .value()
    ;
}

function getCommands(cfg) {
    var commands = cfg.commands || {};

    var aliases = _(commands).pick(_.isString).value();

    return _(commands)
        .omit(_.isString)
        .pairs()
        .sortBy(function(pair) {
            return pair[0].toLowerCase();
        })
        .map(function(pair) {
            return {
                name: changeCase.paramCase(pair[0]),
                help: pair[1].help
            };
        })
        .value()
    ;
}

function outputUsage(usage, log) {
    log('Usage: %s %s', path.basename(process.argv[1]), usage);
}

function outputOptions(options, log) {
    if (options.length) {
        log();
        log('Options:');
        log();

        log(columnify(options, {
            showHeaders: false,
            columnSplitter: '   ',
            columns: [ 'empty', 'names', 'help' ],
            config: {
                names: {
                    align: 'left'
                }
            }
        }));
    }
}

function outputArguments(args, log) {
    if (args.length) {
        log();
        log('Arguments:');
        log();

        log(columnify(args, {
            showHeaders: false,
            columnSplitter: '   ',
            columns: [ 'empty', 'name', 'help' ],
            config: {
                name: {
                    align: 'left'
                }
            }
        }));
    }
}

function outputCommands(commands, log) {
    if (commands.length) {
        log();
        log('Commands:');
        log();

        log(columnify(commands, {
            // maxLineWidth: process.stdout.columns,
            showHeaders: false,
            columnSplitter: '   ',
            columns: [ 'empty', 'name', 'help' ],
            config: {
                name: {
                    align: 'left',
                    maxWidth: 16
                },
                help: {
                    maxWidth: 64 - 6
                }
            }
        }));
    }
}
