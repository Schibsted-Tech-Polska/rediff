var Driver = require('./driver');
var phantomPath = require('phantomjs-prebuilt').path;

// Surpress "Phantom Process died" unhandled rejection
process.on('unhandledRejection', function(reason) {
    if (reason.message !== 'Phantom Process died') {
        console.error('Unhandled rejection: ', reason);
    }
});

function Worker(specs, maxInstances) {
    this.queue = specs || [];
    this.runningInstances = 0;
    this.maxInstances = maxInstances || 1;
}

Worker.prototype = {
    addSpec: function(spec) {
        this.queue.push(spec);
    },

    run: function() {
        console.log('Taking photos (max ' + this.maxInstances + ' instances)');
        this._handleQueue();
    },

    setCallback: function(fn) {
        this.callback = fn;
    },

    _handleQueue: function() {
        while(this.runningInstances < this.maxInstances && this.queue.length) {
            console.log('WORKER: ' + this.queue.length + ' specs left');
            this._runSpec(this.queue.pop());
        }
        if (!this.queue.length && !this.runningInstances) {
            this.callback();
        }
    },

    _runSpec: function(spec) {
        this.runningInstances++;

        var driver = new Driver({phantomPath: phantomPath});
        driver.on('loadFinished', this.onLoad.bind(this, driver, spec));
        driver.on('error', this.onError.bind(this, driver, spec));
        driver.on('timeout', this.onTimeout.bind(this, driver, spec));

        driver
            .viewport(spec.viewport.width, spec.viewport.height)
            .userAgent(spec.userAgent)
            .open(spec.url)
            .injectCss(spec.css)
            .runSpec(spec.run)
            .waitForImages()
            .screenshotSelector(spec.output, spec.cropArea)
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

    onLoad: function(driver, spec) {
        //console.log('loaded');
    }
};

module.exports = Worker;
