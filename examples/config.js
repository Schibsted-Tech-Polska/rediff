module.exports = {
    project: 'google',
    timeout: 3000,
    specsDir: __dirname + '/specs/',
    resultsDir: __dirname + '/../results/',
    environments: {
        current: {
            baseUrl: 'https://www.google.com/'
        },
        candidate: {
            baseUrl: 'https://www.google.no/'
        }
    },
    viewports: {
        desktop: {
            width: 1280,
            height: 1024,
            icon: 'desktop_mac',
            userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36'
        },
        tablet: {
            width: 768,
            height: 1024,
            icon: 'tablet_mac',
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        },
        mobile: {
            width: 320,
            height: 240,
            icon: 'phone_iphone',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        }
    },
    cssFile: __dirname + '/exclude.css'
};
