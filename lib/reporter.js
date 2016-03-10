var fs = require('fs');
var findIndex = require('array-findindex');

function Reporter(config) {
    this.config = config;
    this.collection = [];
}

Reporter.prototype = {
    pushData: function(err, diff, data) {
        var viewportData = Object.assign({}, this.config.viewports[data.viewport], {name: data.viewport});
        delete viewportData.userAgent;
        var specData = {
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

        var idx = findIndex(this.collection, function(spec) {
            return spec.name === data.name;
        });

        if (idx < 0) {
            this.collection.push(specData);
        } else {
            this.collection[idx].results.push(specData.results[0]);
        }
    },

    generateReport: function(start, end) {
        var report = {
            "started": start,
            "finished": end,
            "duration": end - start,
            "failing": 0, // TODO:
            "specs": this.collection,
            "config": Object.assign({}, this.config, {css: {}})
        };

        fs.writeFileSync(this.config.resultsDir + 'report.json', JSON.stringify(report));
    }
};

module.exports = Reporter;
