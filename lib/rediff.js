var cpuLimit = require('os').cpus().length;
var zlib = require('zlib');
var convert = require('png-jpg');
var fs = require('fs');
var Promise = require('bluebird');
var diff = require('png-differ');

var util = require('./util');
var Worker = require('./worker');
var Reporter = require('./reporter');

function Rediff(config, specs) {
    this.config = config;
    this.specs = specs;
    this.worker = new Worker(Math.min(cpuLimit, 4));
    this.reporter = new Reporter(this.config);
    this.envNames = Object.keys(this.config.environments);
}

Rediff.prototype = {
    run: function() {
        var queue = this.generateJobQueue();
        Promise.map(queue, this.processJob.bind(this)).then(function() {
            console.log('Test completed.');
        });
    },

    processJob: function(job) {
        var images = this.envNames.concat(['diff']).map(function(env) {
            return job.spec.results.screenshots[env];
        });

        var loImages = images.map(function(image) {
            return image.replace(/\.png$/, '.jpg');
        });

        var workerPromises = job.worker.map(this.worker.addSpec.bind(this.worker));

        return Promise.all(workerPromises)
            .catch(this.handleError.bind(this, job.spec, 'Crawler'))
            .then(this.diffImages.bind(null, job.spec, images[0], images[1], images[2]))
            .catch(this.handleError.bind(this, job.spec, 'Comparison'))
            .then(this.convertImages.bind(this, images))
            .then(this.reporter.pushData.bind(this.reporter, job.spec))
            .then(this.removeFiles.bind(this, images))
            .then(this.gzipFiles.bind(this, loImages));
    },

    handleError: function(spec, type, err) {
        spec.errors.push({
            type : type,
            data: err
        });
        console.log(type + 'Error:', err);
        return spec;
    },

    diffImages: function(spec, input1, input2, output) {
        return new Promise(function(resolve, reject) {
            if (fs.existsSync(input1) && fs.existsSync(input2)) {
                diff.outputDiff(input1, input2, output, function (error, metrics) {
                    if (error) {
                        reject(error);
                    } else {
                        // Metrics gives values in range [0,25], we need [0,100]
                        spec.results.diff = metrics * 4;
                        resolve(output);
                    }
                });
            } else {
                resolve(output);
            }
        });
    },

    convertImages: function(pngs) {
        return Promise.map(pngs, function(fileToConvert) {
            return new Promise(function(resolve) {
                if (fs.existsSync(fileToConvert)) {
                    convert({
                        input: fileToConvert,
                        output: fileToConvert.replace(/\.png$/, '.jpg')
                    }, function() {
                        resolve(fileToConvert);
                    });
                } else {
                    resolve(fileToConvert);
                }
            });
        });
    },

    gzipFiles: function(files) {
        var gzip = zlib.createGzip();
        return Promise.map(files, function(fileToCompress) {
            if (fs.existsSync(fileToCompress)) {
                var input = fs.createReadStream(fileToCompress);
                var output = fs.createWriteStream(fileToCompress + '.gz');
                input.pipe(gzip).pipe(output);
            }
        });
    },

    removeFiles: function(files) {
        return Promise.map(files, function(fileToRemove) {
            if (fs.existsSync(fileToRemove)) {
                fs.unlinkSync(fileToRemove);
            }
        });
    },

    generateJobQueue: function() {
        var customCss = this.config.cssFile ? fs.readFileSync(this.config.cssFile) : '';
        var jobs = [];
        var spec;
        var viewports;

        for (var i in this.specs) {
            if (!this.specs.hasOwnProperty(i)) {
                continue;
            }
            var specName = this.specs[i];
            spec = require(this.config.specsDir + specName + '.js');
            viewports = util.getSpecViewports(this.config.viewports, spec.viewports);

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
                        css: customCss,
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
