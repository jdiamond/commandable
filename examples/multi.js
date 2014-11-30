#!/usr/bin/env node

'use strict';

require('..')({
    arguments: '<files...>',
    // arguments: [
    //     { name: 'files', required: true, multi: true }
    // ],
    run: function(cmd) {
        console.log(cmd.args.files);
    }
});
