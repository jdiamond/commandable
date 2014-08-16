#!/usr/bin/env node

require('../commandable')({
    options: {
        c: 'config',
        config: {
            help: 'path to config file',
            type: String
        },
        v: 'verbose',
        verbose: {
            help: 'log verbose output',
            type: Boolean
        }
    },
    commands: {
        cluster: {
            help: 'manage clusters',
            commands: {
                list: {
                    help: 'list clusters',
                    run: function(cmd) {
                        console.log('list clusters');
                    }
                },
                add: {
                    help: 'add cluster',
                    arguments: [
                        { name: 'name', type: String, help: 'cluster name', required: true }
                    ],
                    run: function(cmd) {
                        console.log('add cluster "%s"', cmd.args.name);
                    }
                },
                rm: {
                    help: 'remove cluster',
                    arguments: [
                        { name: 'name', type: String, help: 'cluster name', required: true }
                    ],
                    options: {
                        force: { type: Boolean, help: 'force remove' },
                        f: 'force'
                    },
                    run: function(cmd) {
                        console.log(
                            '%s cluster "%s"',
                            (cmd.opts.force ? 'force ' : '') + 'remove',
                            cmd.args.name
                        );
                    }
                }
            }
        },
        node: {
            help: 'manage nodes',
            commands: {
                list: {
                    help: 'list nodes',
                    arguments: '[cluster]',
                    run: function(cmd) {
                        console.log('list nodes in cluster "%s"', cmd.args.name);
                    }
                },
                add: {
                    help: 'add node to cluster',
                    options: {
                        template: { type: String, help: 'path to template' },
                        t: 'template'
                    },
                    arguments: '<name> [cluster]',
                    run: function(cmd) {
                        console.log(
                            'add node "%s" with template "%s" to cluster "%s"',
                            cmd.args.name,
                            cmd.opts.template,
                            cmd.args.cluster
                        );
                    }
                },
                rm: {
                    help: 'remove node from cluster',
                    options: {
                        force: Boolean,
                        f: 'force'
                    },
                    arguments: '<name> [cluster]',
                    run: function(cmd) {
                        console.log(
                            '%s node "%s" from cluster "%s"',
                            (cmd.opts.force ? 'force ' : '') + 'remove',
                            cmd.args.name,
                            cmd.args.cluster
                        );
                    }
                }
            }
        }
    }
});
