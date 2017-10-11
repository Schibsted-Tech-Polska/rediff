var Promise = require('bluebird');
var fetch = require('node-fetch');
var fs = require('fs');
var util = require('util');
const writeFile = util.promisify(fs.writeFile);

function Worker(config) {
    this.queue = [];
    this.config = config;
}

Worker.prototype = {
    addSpec: function(spec, errorHandler) {
        return new Promise(function(resolve, reject) {
            this.queue.push([spec, errorHandler, resolve, reject]);
            this._handleQueue();
        }.bind(this));
    },

    _handleQueue: function() {
        while(this.queue.length) {
            this._runSpec.apply(this, this.queue.pop());
        }
    },

    _runSpec: function(spec, errorHandler, resolve, reject) {
        var body = {
            url: spec.url,
            options: {
                timeout: spec.timeout,
                'user-agent': spec.userAgent,
                width: spec.viewport.width,
                height: spec.viewport.height,
            }
        };

        console.log(`Generating screenshot of ${spec.url} with options`, body.options);
        fetch(`${this.config.nojsSucksBaseUrl}/v1/screenshot`, {
            method: 'POST',
            body:    JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(function(response) {
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
                console.log(`Request succeeded, saving to ${spec.output}`);
                return writeFile(spec.output, buffer);
            })
            .then(function() {
                resolve(spec);
            })
            .catch(function(error) {
                reject({spec: spec, error: error});
            })
            .then(function() {
                this._handleQueue();
            }.bind(this));
    },
};

module.exports = Worker;
