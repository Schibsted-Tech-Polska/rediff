'use strict';

const Promise = require('bluebird');
const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

function Worker(config) {
    this.queue = [];
    this.config = config;
}

Worker.prototype = {
    addSpec: function(spec, errorHandler) {
        return new Promise((resolve, reject) => {
            this.queue.push([spec, errorHandler, resolve, reject]);
            this.handleQueue();
        });
    },

    handleQueue: function() {
        while (this.queue.length) {
            this.runSpec.apply(this, this.queue.pop());
        }
    },

    runSpec: function(spec, errorHandler, resolve, reject) {
        const body = {
            url: spec.url,
            options: {
                timeout: spec.timeout,
                'user-agent': spec.userAgent,
                'inject-css': spec.css,
                'crop-area': spec.cropArea,
                fullPage: spec.fullPage,
                run: String(spec.run),
                width: spec.viewport.width,
                height: spec.viewport.height,
                deviceScaleFactor: spec.viewport.deviceScaleFactor,
            },
        };

        console.log(`Generating screenshot of ${spec.url} with viewport ${JSON.stringify(spec.viewport)}`);

        fetch(`${this.config.nojsSucksBaseUrl}/v1/screenshot`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(response => {
                if (!response.ok || response.status < 200 || response.status >= 400) {
                    throw new Error(`External service error at ${response.url}/v1/screenshot/${body.url}`, {
                        status: response.status,
                        statusText: response.statusText,
                    });
                }

                return response;
            })
            .then(res => res.buffer())
            .then(buffer => {
                console.log(`Request to ${spec.url} succeeded, saving to ${spec.output}`);

                return writeFile(spec.output, buffer);
            })
            .then(() => {
                resolve(spec);
            })
            .catch(error => {
                reject({ spec: spec, error: error });
            })
            .then(() => this.handleQueue());
    },
};

module.exports = Worker;
