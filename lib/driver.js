var Horseman = require('node-horseman');
var HorsemanPromise = require('../node_modules/node-horseman/lib/HorsemanPromise');

var actions = {
    injectCss: function(css) {
        return this.evaluate(function (css) {
            (function injectCss() {
                var styleElement = document.createElement('style');
                styleElement.innerText = css || '';
                document.getElementsByTagName('head')[0].appendChild(styleElement);
            })();
        }, css);
    },
    waitForImages: function() {
        return this.waitFor(function () {
            var images = document.getElementsByTagName('img');
            return Array.prototype.every.call(images, function (i) {
                return i.complete;
            });
        }, true);
    },
    runSpec: function(fn) {
        if (fn instanceof Function) {
            return fn.call(this);
        }
        return this;
    },
    screenshotSelector: function(path, selector) {
        if (selector) {
            return this
                .crop(selector, path)
                .catch(function() {
                    console.error('[Driver Error] Selector ' + selector + ' not found');
                    return this;
                }.bind(this));
        } else {
            return this.screenshot(path);
        }
    }
}

Object.keys(actions).forEach(function(name) {
    Horseman.prototype[name] = actions[name];

    // Allow chaining actions off HorsemanPromises
    HorsemanPromise.prototype[name] = function() {
        var args = arguments;
        return this.then(function(val) {
            this.lastVal = val;
            return this[name].apply(this, args);
        });
    };
});

module.exports = Horseman;
