'use strict';

const fs = require('fs');
const _ = require('lodash');
const util = require('./util');

let config;
let metadata;
let specs;

const report = () => {
    metadata.finished = new Date().getTime();
    metadata.duration = metadata.finished - metadata.started;

    const reportJson = {
        project: _.capitalize(config.project),
        metadata: metadata,
        specs: specs,
        environments: config.environments,
        viewports: config.viewports,
    };

    fs.writeFileSync(config.resultsDir + 'report.json', JSON.stringify(reportJson));
};

const initialize = (cfg, specsData) => {
    config = cfg;
    specs = specsData.map(function(spec) {
        return _.merge(
            {
                // name, url
                tests: {
                    completed: 0,
                    total: 0,
                    results: [],
                },
            },
            spec
        );
    });

    metadata = {
        tests: {
            count: specs
                .map(function(spec) {
                    return spec.tests.total;
                })
                .reduce(util.sum),
            completed: 0,
            failing: 0,
        },
        started: new Date().getTime(),
        finished: null,
        duration: 0,
    };

    report();
};

const push = (result, specName) => {
    metadata.tests.completed++;
    if (result.errors.length > 0) {
        metadata.tests.failing++;
    }

    _.keys(result.screenshots).forEach(function(screenshot) {
        result.screenshots[screenshot] = result.screenshots[screenshot]
            .replace(config.resultsDir, '')
            .replace(/\.png$/, '.jpg');
    });

    const spec = _.find(specs, specDefinition => specDefinition.name === specName);

    if (!spec) {
        console.warn('[Rediff Reporter] Spec "' + specName + '" not found in the result set');
    } else {
        spec.tests.results.push(result);
        spec.tests.completed++;
    }
    report();
};

module.exports = {
    initialize,
    push,
    report,
};
