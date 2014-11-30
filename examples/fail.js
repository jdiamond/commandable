#!/usr/bin/env node

require('../commandable')({
    run: function(cmd) {
        throw new Error('always fails');
    }
});
