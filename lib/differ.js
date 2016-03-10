var differ = require('png-differ');

function Differ(specs) {
    this.queue = specs || [];
    this.running = false;
    this.handler = function() {};
    this.callback = function() {};
};

Differ.prototype = {
    addSpec: function(spec) {
        this.queue.push(spec);
    },

    run: function() {
        console.log('Computing image differences');
        this._handleQueue();
    },

    setHandler: function(fn) {
        this.handler = fn;
    },

    setCallback: function(fn) {
        this.callback = fn;
    },

    _handleQueue: function() {
        if (!this.running) {
            if (this.queue.length) {
                this._runSpec(this.queue.pop());
            } else if(this.callback instanceof Function) {
                this.callback();
            }
        }
    },

    _runSpec: function(spec) {
        differ.outputDiff(spec.images[0], spec.images[1], spec.diff, function(err, metrics) {
            this.handler(err, metrics, spec);
            this.runnig = false;
            this._handleQueue();
        }.bind(this));
    }
};

module.exports = Differ;
