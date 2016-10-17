var Driver = require('./driver');
var phantomPath = require('phantomjs-prebuilt').path;
var Promise = require('bluebird');

// Surpress "Phantom Process died" unhandled rejection
process.on('unhandledRejection', function(reason) {
    if (reason.message !== 'Phantom Process died') {
        console.error('Unhandled rejection: ', reason);
    }
});

function Worker(maxInstances) {
    this.queue = [];
    this.runningInstances = 0;
    this.maxInstances = maxInstances || 1;
}

Worker.prototype = {
    addSpec: function(spec, errorHandler) {
        return new Promise(function(resolve, reject) {
            this.queue.push([spec, errorHandler, resolve, reject]);
            this._handleQueue();
        }.bind(this));
    },

    _handleQueue: function() {
        while(this.runningInstances < this.maxInstances && this.queue.length) {
            this._runSpec.apply(this, this.queue.pop());
        }
    },

    _runSpec: function(spec, errorHandler, resolve, reject) {
        this.runningInstances++;
        var driver = new Driver({
            phantomPath: phantomPath,
            timeout: spec.timeout
        });
        driver.on('loadFinished', this.onLoad.bind(this, driver, spec));
        driver.on('error', this.onError.bind(this, driver, spec));
        driver.on('timeout', this.onTimeout.bind(this, driver, spec));

        driver
            .viewport(spec.viewport.width, spec.viewport.height)
            .userAgent(spec.userAgent)
            .open(spec.url)
            .injectCss(spec.css)
            .runSpec(spec.run)
            .catch(errorHandler)
            .waitForImages()
            .catch(errorHandler)
            .screenshotSelector(spec.output, spec.cropArea)
            .then(function() {
                resolve(spec);
            })
            .catch(function(error) {
                reject({spec: spec, error: error});
            })
            .close()
            .then(function() {
                this.runningInstances--;
                this._handleQueue();
            }.bind(this));
    },

    onError: function(driver, spec, err) {
        console.error('[Error] ', err);
    },

    onTimeout: function(driver, spec) {
        console.warn('[Timeout] ' + spec.url);
    },

    onLoad: function(driver, spec) {}
};

module.exports = Worker;
