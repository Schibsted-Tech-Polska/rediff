'use strict';
const argv = require('yargs').argv;
const fs = require('fs');
const path = require('path');
const rmdir = require('rmdir-recursive');

const Rediff = require('./lib/rediff');
const config = require(path.join(process.cwd(), argv.config || 'config.js'));

if(Object.keys(config.environments).length !== 2) {
    console.log('ERROR: Rediff expected exactly 2 environments to compare');
    process.exit(1);
}

let specs;
if (!argv.spec || argv.spec === 'all') {
    specs = fs.readdirSync(config.specsDir)
        .map(spec => spec.substr(0, spec.length - 3));
} else {
    specs = argv.spec.toString().split(' ');
}

rmdir.sync(config.resultsDir);

let rediff = new Rediff(config, specs);
rediff.run();
