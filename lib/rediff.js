'use strict';
const argv = require('yargs').argv;
const cpuLimit = require('os').cpus().length;

const Worker = require('./worker');
const Differ = require('./differ');
const Reporter = require('./reporter');

class Rediff {
    constructor(config, specs) {
        this.config = config;
        this.specs = specs;
        this.customCss = this.getCustomCss(this.config.css);
    }

    run() {
        this.startedAt = new Date().getTime();
        let queues = this.getSpecQueues();
        let worker = new Worker(queues.shot, Math.min(cpuLimit, 4));
        let differ = new Differ(queues.diff);
        let reporter = new Reporter(this.config);

        worker.setCallback(differ.run.bind(differ));
        differ.setHandler(reporter.pushData.bind(reporter));
        differ.setCallback(() => {
            reporter.generateReport(this.startedAt, new Date().getTime());
        });
        worker.run();
    }

    getSpecViewports(filter) {
        if (!filter || !filter.length) {
            return this.config.viewports;
        }
        return filter.map(name => {
            if (!this.config.viewports[name]) {
                console.log('WARNING: You are trying to use viewport "' + name +
                    '". This viewport is not defined in your config file.');
                return null;
            }
            return this.config.viewports[name];
        }).filter((viewport) => viewport !== null);
    }

    getCustomCss(css) {
        css = css || {};
        return Object.keys(css)
            .map(key => key + ' { ' + css[key] + ' } ')
            .join('');
    }

    getSpecQueues() {
        let shotSpecs = [];
        let diffSpecs = [];
        for (let specName of this.specs) {
            let spec = require(this.config.specsDir + specName + '.js');
            let viewports = this.getSpecViewports(spec.viewports);

            Object.keys(viewports).forEach(viewport => {
                let images = [];
                Object.keys(this.config.environments).forEach(env => {
                    let outputFile = this.config.resultsDir + specName + '-' + viewport + '-' + env + '.png';
                    shotSpecs.push({
                        viewport: {
                            width: viewports[viewport].width,
                            height: viewports[viewport].height
                        },
                        url: this.config.environments[env].baseUrl + spec.path,
                        userAgent: viewports[viewport].userAgent,
                        css: this.customCss,
                        run: spec.run,
                        output: outputFile
                    });
                    images.push(outputFile)
                });

                diffSpecs.push({
                    images: images,
                    diff: this.config.resultsDir + specName + '-' + viewport + '-diff.png',
                    name: specName,
                    url: spec.path,
                    viewport: viewport
                });
            });
        }
        return {
            shot: shotSpecs,
            diff: diffSpecs
        }
    }
}

module.exports = Rediff;