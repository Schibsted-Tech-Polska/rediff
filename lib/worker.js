var Horseman = require('node-horseman');
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

        var horseman = new Horseman({phantomPath: phantomPath})
            .viewport(spec.viewport.width, spec.viewport.height)
            .userAgent(spec.userAgent);

        horseman.on('loadFinished', this.onLoad.bind(this, horseman, spec));
        horseman.on('error', this.onError.bind(this, horseman, spec));
        horseman.on('timeout', this.onTimeout.bind(this, horseman, spec));
        horseman.open(spec.url);
    },

    onError: function(horseman, spec, err) {
        console.error('[Error] ', err);
    },

    onTimeout: function(horseman, spec) {
        console.warn('[Timeout] ' + spec.url);
    },

    onLoad: function(horseman, spec) {
        // Inject css
        horseman = horseman.evaluate(function(css) {
            (function injectCss() {
                var styleElement = document.createElement('style');
                styleElement.innerText = css || '';
                document.getElementsByTagName('head')[0].appendChild(styleElement);
            })();
        }, spec.css);

        // Run spec
        if (spec.run instanceof Function) {
            horseman = spec.run.call(horseman);
        }

        // Wait for all images
        horseman = horseman.waitFor(function() {
            var images = document.getElementsByTagName('img');
            return Array.prototype.every.call(images, function(i) { return i.complete; });
        }, true);

        // Take screenshot
        if (spec.cropArea) {
            horseman = horseman.crop(spec.cropArea, spec.output);
        } else {
            horseman = horseman.screenshot(spec.output);
        }

        horseman.close().then(function() {
            this.runningInstances--;
            this._handleQueue();
        }.bind(this));
    }
};

module.exports = Worker;
