var Horseman = require('node-horseman');
var phantomPath = require('phantomjs-prebuilt').path;

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
            // console.log('WORKER: ' + this.queue.length + ' specs left');
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
            .userAgent(spec.userAgent)
            .on('loadFinished', function() {
                horseman.evaluate(function(css) {
                    (function injectCss() {
                        var styleElement = document.createElement('style');
                        styleElement.innerText = css;
                        document.getElementsByTagName('head')[0].appendChild(styleElement);
                    })();
                }, spec.css || '');
                var run = spec.run || function() { return this; };
                run.call(horseman)
                    .waitFor(function() {
                        var images = document.getElementsByTagName('img');
                        return Array.prototype.every.call(images, function(i) { return i.complete; });
                    }, true)
                    .screenshot(spec.output)
                    .close()
                    .then(function() {
                        this.runningInstances--;
                        this._handleQueue();
                    }.bind(this));
            }.bind(this))
            .on('error', function(err) {
                console.error('ERROR', err);
            })
            .on('timeout', function() {
                horseman.wait(2000);
                console.warn('TIMEOUT: I give you 2 more seconds');
            })
            .on('consoleMessage', function(log) {
                console.log('LOG', log);
            })
            .open(spec.url);
    }
};

module.exports = Worker;
