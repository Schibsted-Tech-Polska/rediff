var Promise = require('bluebird');
var zlib = require('zlib');
var fs = require('fs');
var convert = require('png-jpg');
var diff = require('pngdiff');
var cpuLimit = require('os').cpus().length;
var util = require('./util');
var Worker = require('./worker');
var reporter = require('./reporter');

var envNames;
var config;
var specs;
var worker;
var queue;

function run(cfg, specList) {
    config = cfg;
    specs = specList;
    worker = new Worker(Math.min(cpuLimit, 4));
    envNames = Object.keys(config.environments);
    queue = generateJobQueue();

    reporter.initialize(config, queue.map(function(item) {
        return item.spec;
    }));

    Promise.map(queue, processJobSet).then(function() {
        console.log('Test completed.');
    });
}

function processJobSet(job) {
    return Promise.map(job.worker, function(jobs, idx) {
        return processJob(job.worker[idx], job.tests[idx], job.spec.name);
    });
}

function processJob(jobs, test, specName) {
    var images = envNames.concat(['diff']).map(function(env) {
        return test.screenshots[env];
    });

    var loImages = images.map(function(image) {
        return image.replace(/\.png$/, '.jpg');
    });

    var workerPromises = jobs.map(worker.addSpec.bind(worker));

    return Promise
        .all(workerPromises)
        .catch(function(err) {
            handleError(test, 'Crawler', err);
        }).then(function() {
            return diffImages(test, images[0], images[1], images[2]);
        }).catch(function(err) {
            handleError(test, 'Comparison', err);
        }).then(function() {
            return convertImages(images);
        }).then(function() {
            return removeFiles(images)
        }).then(function() {
            gzipFiles(loImages)
        }).catch(function(err) {
            handleError(test, 'General', err);
        }).finally(function() {
            reporter.push(test, specName);
        });
}

function handleError(test, type, err) {
    err = err.error || err;
    test.errors.push({
        type : type,
        data: err
    });
    console.log(type + 'Error:', err.message);
    return test;
}

function diffImages(test, input1, input2, output) {
    if (fs.existsSync(input1) && fs.existsSync(input2)) {
        return diff.outputDiff(input1, input2, output, diffPixel)
            .then(function(data) {
                test.diff = data.metric;
                return data.output;
            });
    } else {
        return Promise.reject(new Error('Unable to create diff file ' + output));
    }
}

function convertImages(pngs) {
    return Promise.map(pngs, function(fileToConvert) {
        return new Promise(function(resolve) {
            if (fs.existsSync(fileToConvert)) {
                convert({
                    input: fileToConvert,
                    output: fileToConvert.replace(/\.png$/, '.jpg'),
                    quality: 80
                }, function() {
                    resolve(fileToConvert);
                });
            } else {
                resolve(fileToConvert);
            }
        });
    });
}

function gzipFiles(files) {
    var gzip = zlib.createGzip();
    return Promise.map(files, function(fileToCompress) {
        if (fs.existsSync(fileToCompress)) {
            var input = fs.createReadStream(fileToCompress);
            var output = fs.createWriteStream(fileToCompress + '.gz');
            input.pipe(gzip).pipe(output);
            // TODO: promisify
            return Promise.resolve(output);
        }
    });
}

function removeFiles(files) {
    return Promise.map(files, function(fileToRemove) {
        if (fs.existsSync(fileToRemove)) {
            fs.unlinkSync(fileToRemove);
        }
    });
}

function generateJobQueue() {
    var customCss = config.cssFile ? String(fs.readFileSync(config.cssFile)) : '';
    var jobs = [];
    var spec;
    var viewports;

    for (var i in specs) {
        if (!specs.hasOwnProperty(i)) {
            continue;
        }
        var specName = specs[i];
        spec = require(config.specsDir + specName + '.js');
        viewports = util.getSpecViewports(config.viewports, spec.viewports);

        var item = {
            worker: [],
            spec: {
                name: specName.replace(/[^a-z0-9]+/ig, ' ').trim(),
                slug: specName,
                url: spec.path,
                tests: {
                    total: Object.keys(viewports).length,
                    results: []
                }
            },
            tests: []
        };

        Object.keys(viewports).forEach(function(viewport) {
            var screenshots = {diff: config.resultsDir + specName + '-' + viewport + '-diff.png'};
            var workerJobs = [];

            Object.keys(config.environments).forEach(function(env) {
                var outputFile = config.resultsDir + specName + '-' + viewport + '-' + env + '.png';
                workerJobs.push({
                    viewport: {
                        width: viewports[viewport].width,
                        height: viewports[viewport].height
                    },
                    timeout: config.timeout || 5000,
                    url: config.environments[env].baseUrl + spec.path,
                    userAgent: viewports[viewport].userAgent,
                    css: customCss,
                    run: spec.run,
                    cropArea: spec.cropArea,
                    output: outputFile
                });
                screenshots[env] = outputFile;
            });

            item.worker.push(workerJobs);
            item.tests.push({
                viewport: viewport,
                diff: 100,
                screenshots: screenshots,
                errors: []
            });
        });
        jobs.push(item);
    }
    return jobs;
}

function diffPixel(pixel1, pixel2, match) {
    var addRed = 60;
    if (match) {
        return pixel1;
    } else {
        // turn the diff pixels redder. No change to alpha
        if (pixel2[0] + addRed <= 255) {
            return [
                pixel2[0] + addRed,
                Math.max(pixel2[1] - addRed, 0),
                Math.max(pixel2[2] - addRed, 0),
                Math.max(50, Math.min(255, pixel2[3] * 2))
            ];
        } else {
            // too bright; subtract G and B instead
            return [
                pixel2[0],
                Math.max(0, pixel2[1] - addRed),
                Math.max(0, pixel2[2] - addRed),
                Math.max(50, Math.min(255, pixel2[3] * 2))
            ];
        }
    }
}

module.exports = run;
