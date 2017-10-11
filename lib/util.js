'use strict';

const getSpecViewports = (viewports, filter) => {
    if (!filter || !filter.length) {
        return viewports;
    }
    let result = {};
    filter.forEach(function(name) {
        if (!viewports[name]) {
            console.warn(
                'WARNING: You are trying to use viewport "' +
                    name +
                    '". This viewport is not defined in your config file.'
            );
        }
        result[name] = viewports[name];
    });

    return result;
};

const sum = (a, b) => a + b;

module.exports = {
    getSpecViewports,
    sum,
};
