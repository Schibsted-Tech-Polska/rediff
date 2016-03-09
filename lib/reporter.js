'use strict';
var fs = require('fs');

class Reporter {
    constructor(config) {
        this.config = config;
        this.collection = [];
    }

    pushData(err, diff, data) {
        let viewportData = Object.assign({}, this.config.viewports[data.viewport], {name: data.viewport});
        delete viewportData.userAgent;
        let specData = {
            name: data.name,
            url: data.url,
            results: [{
                viewport: viewportData,
                diff: diff,
                screenshots: {
                    // TODO:
                    candidate: data.images[1].replace(this.config.resultsDir, ''),
                    // TODO:
                    current: data.images[0].replace(this.config.resultsDir, ''),
                    diff: data.diff.replace(this.config.resultsDir, '')
                }
            }],
            error: err
        };

        let idx = this.collection.findIndex(spec => spec.name === data.name);
        if (idx < 0) {
            this.collection.push(specData);
        } else {
            this.collection[idx].results.push(specData.results[0]);
        }
    }

    generateReport(start, end) {
        let report = {
            "started": start,
            "finished": end,
            "duration": end - start,
            "failing": 0, // TODO:
            "specs": this.collection,
            "config": Object.assign({}, this.config, {css: {}})
        };

        fs.writeFileSync(this.config.resultsDir + 'report.json', JSON.stringify(report));
    }
}

module.exports = Reporter;
