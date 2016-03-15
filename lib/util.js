function getSpecViewports(viewports, filter) {
    if (!filter || !filter.length) {
        return viewports;
    }
    var result = {};
    filter.forEach(function(name) {
        if (!viewports[name]) {
            console.warn('WARNING: You are trying to use viewport "' + name +
                '". This viewport is not defined in your config file.');
        }
        result[name] = viewports[name];
    }.bind(this));
    return result;
}

function getCustomCss(css) {
    css = css || {};
    return Object.keys(css)
        .map(function(key) {
            return key + ' { ' + css[key] + ' } ';
        }).join('');
}

module.exports = {
    getSpecViewports: getSpecViewports,
    getCustomCss: getCustomCss
};
