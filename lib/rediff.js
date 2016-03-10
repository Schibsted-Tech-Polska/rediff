var cpuLimit = require('os').cpus().length;

var Worker = require('./worker');
var Differ = require('./differ');
var Reporter = require('./reporter');

function Rediff(config, specs) {
    this.config = config;
    this.specs = specs;
    this.customCss = this.getCustomCss(this.config.css);
}

Rediff.prototype = {
    run: function() {
        this.startedAt = new Date().getTime();
        var queues = this.getSpecQueues();
        var worker = new Worker(queues.shot, Math.min(cpuLimit, 4));
        var differ = new Differ(queues.diff);
        var reporter = new Reporter(this.config);

        worker.setCallback(differ.run.bind(differ));
        differ.setHandler(reporter.pushData.bind(reporter));
        differ.setCallback(function() {
            reporter.generateReport(this.startedAt, new Date().getTime());
        }.bind(this));
        worker.run();
    },

    getSpecViewports: function(filter) {
        if (!filter || !filter.length) {
            return this.config.viewports;
        }
        var viewports = {};
        filter.forEach(function(name) {
            if (!this.config.viewports[name]) {
                console.log('WARNING: You are trying to use viewport "' + name +
                    '". This viewport is not defined in your config file.');
            }
            viewports[name] = this.config.viewports[name];
        }.bind(this));
        return viewports;
    },

    getCustomCss: function(css) {
        css = css || {};
        return Object.keys(css)
            .map(function(key) {
                return key + ' { ' + css[key] + ' } ';
            }).join('');
    },

    getSpecQueues: function() {
        var shotSpecs = [];
        var diffSpecs = [];
        var spec;
        var viewports;
        for (var i in this.specs) {
            if (!this.specs.hasOwnProperty(i)) {
                continue;
            }
            var specName = this.specs[i];
            spec = require(this.config.specsDir + specName + '.js');
            viewports = this.getSpecViewports(spec.viewports);

            Object.keys(viewports).forEach(function(viewport) {
                var images = [];
                Object.keys(this.config.environments).forEach(function(env) {
                    var outputFile = this.config.resultsDir + specName + '-' + viewport + '-' + env + '.png';
                    shotSpecs.push({
                        viewport: {
                            width: viewports[viewport].width,
                            height: viewports[viewport].height
                        },
                        url: this.config.environments[env].baseUrl + spec.path,
                        userAgent: viewports[viewport].userAgent,
                        css: this.customCss,
                        run: spec.run,
                        cropArea: spec.cropArea,
                        output: outputFile
                    });
                    images.push(outputFile)
                }.bind(this));

                diffSpecs.push({
                    images: images,
                    diff: this.config.resultsDir + specName + '-' + viewport + '-diff.png',
                    name: specName,
                    url: spec.path,
                    viewport: viewport
                });
            }.bind(this));
        }
        return {
            shot: shotSpecs,
            diff: diffSpecs
        }
    }
};

module.exports = Rediff;
