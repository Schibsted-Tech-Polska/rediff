var cpuLimit = require('os').cpus().length;
var convert = require('png-jpg');
var zlib = require('zlib');
var fs = require('fs');
var Promise = require('bluebird');
var diff = require('png-differ');

var Worker = require('./worker');
var Reporter = require('./reporter');

function streamToPromise(stream) {
    return new Promise(function(resolve, reject) {
        stream.on("end", resolve);
        stream.on("error", reject);
    });
}

function Rediff(config, specs) {
    this.config = config;
    this.specs = specs;
    this.worker = new Worker(Math.min(cpuLimit, 4));
    this.reporter = new Reporter(this.config);
    this.envNames = Object.keys(this.config.environments);
    this.customCss = this.getCustomCss(this.config.css);
}

Rediff.prototype = {
    run: function() {
        var queue = this.generateJobQueue();
        Promise.map(queue, this.process.bind(this));
    },

    process: function(job) {
        var workerPromises = job.worker.map(this.worker.addSpec.bind(this.worker));
        var images = this.envNames.concat(['diff']).map(function(env) {
            return job.spec.results.screenshots[env];
        });

        return Promise.all(workerPromises)
            .then(this.diffImages.bind(null, images[0], images[1], images[2]))
            .then(function(diffData) {
                job.spec.results.diff = diffData.metrics;
                if (diffData.error) {
                    job.spec.errors.push(diffData.error);
                }
                this.reporter.pushData(job.spec);
                return images;
            }.bind(this))
            .then(this.convertImages)
            .then(this.gzipFiles);
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

    diffImages: function(input1, input2, output) {
        return new Promise(function(resolve, reject) {
            try {
                diff.outputDiff(input1, input2, output, function (error, metrics) {
                    if (error) {
                        resolve({error: error, metrics: 100});
                    } else {
                        // Metrics gives values in range [0,25], we need [0,100]
                        resolve({metrics: metrics * 4});
                    }
                });
            } catch(error) {
                resolve({error: error, metrics: 100});
            }
        });
    },

    convertImages: function(pngs) {
        var jpgs = [];
        return Promise.map(pngs, function(filename) {
            return new Promise(function(resolve, reject) {
                var jpgFilename = filename.replace(/\.png$/, '.jpg');
                jpgs.push(jpgFilename);
                try {
                    convert({
                        input: filename,
                        output: jpgFilename
                    }, function() {
                        resolve(filename);
                    });
                } catch(err) {
                    resolve(filename);
                }
            });
        }).then(function() {
            // Return all images
            return pngs.concat(jpgs);
        });
    },

    gzipFiles: function(files) {
        var gzip = zlib.createGzip();
        return Promise.map(files, function(filename) {
            var input = fs.createReadStream(filename);
            var output = fs.createWriteStream(filename + '.gz');
            return streamToPromise(input.pipe(gzip).pipe(output));
        });
    },

    generateJobQueue: function() {
        var jobs = [];

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
                var screenshots = {diff: this.config.resultsDir + specName + '-' + viewport + '-diff.png'};
                var workerJobs = [];

                Object.keys(this.config.environments).forEach(function(env) {
                    var outputFile = this.config.resultsDir + specName + '-' + viewport + '-' + env + '.png';
                    workerJobs.push({
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
                    screenshots[env] = outputFile;
                }.bind(this));

                jobs.push({
                    worker: workerJobs,
                    spec: {
                        name: specName,
                        url: spec.path,
                        results: {
                            viewport: {
                                width: viewports[viewport].width,
                                height: viewports[viewport].height,
                                name: viewport
                            },
                            diff: 100,
                            screenshots: screenshots
                        },
                        errors: []
                    }
                });
            }.bind(this));
        }
        return jobs;
    }
};

module.exports = Rediff;
