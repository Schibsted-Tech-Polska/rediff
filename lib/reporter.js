var fs = require('fs');
var findIndex = require('array-findindex');

function Reporter(config) {
    this.config = config;
    this.collection = [];
    this.started = new Date().getTime();
    this.failing = 0;
}

Reporter.prototype = {
    pushData: function(spec) {
        if (spec.error) {
            this.failing++;
        }

        for(var env in spec.results.screenshots) {
            if(spec.results.screenshots.hasOwnProperty(env)) {
                spec.results.screenshots[env] = spec.results.screenshots[env].replace(
                    this.config.resultsDir, ''
                ).replace(/\.png$/, '.jpg');
            }
        }

        var idx = findIndex(this.collection, function(result) {
            return result.name === spec.name;
        });

        if (idx < 0) {
            spec.results = [spec.results];
            this.collection.push(spec);
        } else {
            this.collection[idx].results.push(spec.results);
        }
        this.generateReport();
    },

    generateReport: function() {
        var finished = new Date().getTime();
        var report = {
            "started": this.started,
            "finished": finished,
            "duration": finished - this.started,
            "failing": this.failing,
            "specs": this.collection,
            "config": Object.assign({}, this.config, {css: {}})
        };

        fs.writeFileSync(this.config.resultsDir + 'report.json', JSON.stringify(report));
    }
};

module.exports = Reporter;
