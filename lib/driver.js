var Horseman = require('node-horseman');

Horseman.registerAction('injectCss', function(css) {
    return this.evaluate(function (css) {
        (function injectCss() {
            var styleElement = document.createElement('style');
            styleElement.innerText = css || '';
            document.getElementsByTagName('head')[0].appendChild(styleElement);
        })();
    }, css);
});

Horseman.registerAction('waitForImages', function(css) {
    return this.waitFor(function () {
        var images = document.getElementsByTagName('img');
        return Array.prototype.every.call(images, function (i) {
            return i.complete;
        });
    }, true);
});

Horseman.registerAction('runSpec', function(fn) {
    if (fn instanceof Function) {
        return fn.call(this);
    }
    return this;
});

Horseman.registerAction('screenshotSelector', function(path, selector) {
    if (selector) {
        return this
            .crop(selector, path)
            .catch(function() {
                console.error('[Driver Error] Selector ' + selector + ' not found');
                // Fallback to screenshot
                return this.screenshot(path);
            }.bind(this));
    } else {
        return this.screenshot(path);
    }
});

module.exports = Horseman;
