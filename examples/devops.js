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
            help: 'use verbose output',
            type: Boolean
        }
    },
    commands: {
        cluster: {
            help: 'manage clusters',
            commands: {
                list: {
                    help: 'list clusters',
                    run: function(opts) {
                        console.log('list clusters');
                    }
                },
                add: {
                    help: 'add cluster',
                    usage: '<name>',
                    arguments: {
                        name: { type: String, help: 'cluster name' }
                    },
                    run: function(opts) {
                        console.log('add cluster "%s"');
                    }
                },
                rm: {
                    help: 'remove cluster',
                    usage: '<name>',
                    arguments: {
                        name: { type: String, help: 'cluster name' }
                    },
                    run: function(opts) {
                        console.log('rm cluster "%s"');
                    }
                }
            }
        },
        node: {
            help: 'manage nodes',
            commands: {
                'list': {
                    help: 'list nodes in cluster',
                    usage: '[<cluster>]',
                    arguments: {
                        cluster: { type: String, help: 'cluster name' }
                    },
                    run: function(opts) {
                        console.log('list nodes in cluster "%s"');
                    }
                },
                add: {
                    help: 'add node to cluster',
                    usage: '<name> <template> [<cluster>]',
                    arguments: {
                        name: { type: String, help: 'node name' },
                        template: { type: String, help: 'path to template' },
                        cluster: { type: String, help: 'cluster name' }
                    },
                    run: function(opts) {
                        console.log('add node "%s" with template "%s" to cluster "%s"');
                    }
                },
                rm: {
                    help: 'remove node from cluster',
                    usage: '<name> [<cluster>]',
                    arguments: {
                        name: { type: String, help: 'node name' },
                        cluster: { type: String, help: 'cluster name' }
                    },
                    run: function(opts) {
                        console.log('remove node "%s" from cluster "%s"');
                    }
                }
            }
        }
    }
});
