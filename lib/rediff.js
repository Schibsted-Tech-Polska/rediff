/* eslint-disable no-loop-func */
'use strict';

const Promise = require('bluebird');
const zlib = require('zlib');
const fs = require('fs');
const convert = require('png-jpg');
const diff = require('pngdiff');
const util = require('./util');
const Worker = require('./worker');
const reporter = require('./reporter');

let envNames;
let config;
let specs;
let worker;
let queue;

const generateJobQueue = () => {
    const customCss = config.cssFile ? String(fs.readFileSync(config.cssFile)) : '';
    let jobs = [];
    let spec;
    let viewports;

    for (let i in specs) {
        if (!specs.hasOwnProperty(i)) {
            continue;
        }
        let specName = specs[i];
        spec = require(config.specsDir + specName + '.js');
        viewports = util.getSpecViewports(config.viewports, spec.viewports);

        let item = {
            worker: [],
            spec: {
                name: specName.replace(/[^a-z0-9]+/gi, ' ').trim(),
                slug: specName,
                url: spec.path,
                tests: {
                    total: Object.keys(viewports).length,
                    results: [],
                },
            },
            tests: [],
        };

        Object.keys(viewports).forEach(viewport => {
            const screenshots = { diff: config.resultsDir + specName + '-' + viewport + '-diff.png' };
            let workerJobs = [];

            Object.keys(config.environments).forEach(env => {
                const outputFile = config.resultsDir + specName + '-' + viewport + '-' + env + '.png';
                workerJobs.push({
                    viewport: {
                        width: viewports[viewport].width,
                        height: viewports[viewport].height,
                    },
                    timeout: config.timeout || 5000,
                    url: config.environments[env].baseUrl + spec.path,
                    userAgent: viewports[viewport].userAgent,
                    css: customCss,
                    run: spec.run,
                    cropArea: spec.cropArea,
                    output: outputFile,
                });
                screenshots[env] = outputFile;
            });

            item.worker.push(workerJobs);
            item.tests.push({
                viewport: viewport,
                diff: 100,
                screenshots: screenshots,
                errors: [],
            });
        });
        jobs.push(item);
    }
    return jobs;
};

const handleError = (test, type, err) => {
    err = err || {};
    err = err.error || err;
    test.errors = test.errors || [];
    test.errors.push({
        type: type,
        data: err.message,
    });
    console.log(type + 'Error:', err.message, err.stack);
    return test;
};

const diffPixel = (pixel1, pixel2, match) => {
    const addRed = 60;
    if (match) {
        return pixel1;
    }
    // turn the diff pixels redder. No change to alpha
    if (pixel2[0] + addRed <= 255) {
        return [
            pixel2[0] + addRed,
            Math.max(pixel2[1] - addRed, 0),
            Math.max(pixel2[2] - addRed, 0),
            Math.max(50, Math.min(255, pixel2[3] * 2)),
        ];
    }
    // too bright; subtract G and B instead
    return [
        pixel2[0],
        Math.max(0, pixel2[1] - addRed),
        Math.max(0, pixel2[2] - addRed),
        Math.max(50, Math.min(255, pixel2[3] * 2)),
    ];
};

const diffImages = (test, input1, input2, output) => {
    if (fs.existsSync(input1) && fs.existsSync(input2)) {
        return diff.outputDiff(input1, input2, output, diffPixel).then(data => {
            test.diff = data.metric;
            return data.output;
        });
    }
    return Promise.reject(new Error('Unable to create diff file ' + output));
};

const convertImages = pngs => {
    return Promise.map(pngs, fileToConvert => {
        return new Promise(resolve => {
            if (fs.existsSync(fileToConvert)) {
                convert(
                    {
                        input: fileToConvert,
                        output: fileToConvert.replace(/\.png$/, '.jpg'),
                        quality: 80,
                    },
                    () => resolve(fileToConvert)
                );
            } else {
                resolve(fileToConvert);
            }
        });
    });
};

const gzipFiles = files => {
    const gzip = zlib.createGzip();
    return Promise.map(files, fileToCompress => {
        if (fs.existsSync(fileToCompress)) {
            const input = fs.createReadStream(fileToCompress);
            const output = fs.createWriteStream(fileToCompress + '.gz');
            input.pipe(gzip).pipe(output);
            return Promise.resolve(output);
        }

        return Promise.reject();
    });
};

const removeFiles = files => {
    return Promise.map(files, fileToRemove => {
        if (fs.existsSync(fileToRemove)) {
            fs.unlinkSync(fileToRemove);
        }
    });
};

const processJob = (jobs, test, specName) => {
    const images = envNames.concat(['diff']).map(env => test.screenshots[env]);

    const loImages = images.map(image => image.replace(/\.png$/, '.jpg'));

    const workerPromises = jobs.map(job => worker.addSpec(job, handleError.bind(null, job, 'TestRunner')));

    return Promise.all(workerPromises)
        .catch(err => handleError(test, 'Crawler', err))
        .then(() => diffImages(test, images[0], images[1], images[2]))
        .catch(err => handleError(test, 'Comparison', err))
        .then(() => convertImages(images))
        .then(() => removeFiles(images))
        .then(() => gzipFiles(loImages))
        .catch(err => handleError(test, 'General', err))
        .finally(() => reporter.push(test, specName));
};

const processJobSet = job =>
    Promise.map(job.worker, (jobs, idx) => processJob(job.worker[idx], job.tests[idx], job.spec.name));

const run = (cfg, specList) => {
    config = cfg;
    specs = specList;
    worker = new Worker(config);
    envNames = Object.keys(config.environments);
    queue = generateJobQueue();

    reporter.initialize(
        config,
        queue.map(item => item.spec)
    );

    Promise.map(queue, processJobSet)
        .then(() => console.log('Test completed.'));
};

module.exports = run;
