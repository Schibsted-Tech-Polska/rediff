'use strict';
const differ = require('png-differ');

class Differ {
    constructor(specs) {
        this.queue = specs || [];
        this.running = false;
        this.handler = () => {};
        this.callback = () => {};
    }

    addSpec(spec) {
        this.queue.push(spec);
    }

    run() {
        console.log('Computing image differences');
        this._handleQueue();
    }

    setHandler(fn) {
        this.handler = fn;
    }

    setCallback(fn) {
        this.callback = fn;
    }

    _handleQueue() {
        if (!this.running) {
            if (this.queue.length) {
                this._runSpec(this.queue.pop());
            } else if(this.callback instanceof Function) {
                this.callback();
            }
        }
    }

    _runSpec(spec) {
        differ.outputDiff(spec.images[0], spec.images[1], spec.diff, (err, metrics) => {
            this.handler(err, metrics, spec);
            this.runnig = false;
            this._handleQueue();
        });
    }
}

module.exports = Differ;
