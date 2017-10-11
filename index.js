'use strict';

const argv = require('yargs').argv;
const fs = require('fs');
const path = require('path');
const rmdir = require('rmdir-recursive');

const rediff = require('./lib/rediff');
const config = require(path.join(process.cwd(), argv.config || 'config.js'));

if (!config.nojsSucksBaseUrl) {
    console.error('ERROR: Rediff requires a working instance of https://github.com/Schibsted-Tech-Polska/nojs.sucks');
    process.exit(1);
}

if (Object.keys(config.environments).length !== 2) {
    console.error('ERROR: Rediff expected exactly 2 environments to compare');
    process.exit(1);
}

let specs;
if (!argv.spec || argv.spec === 'all') {
    specs = fs.readdirSync(config.specsDir).map(function(spec) {
        return spec.substr(0, spec.length - 3);
    });
} else {
    specs = argv.spec.toString().split(' ');
}

rmdir.sync(config.resultsDir);
fs.mkdirSync(config.resultsDir);

rediff(config, specs);
