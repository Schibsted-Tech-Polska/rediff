# Rediff
Rediff is a visual comparison tool used to quickly catch differences between production and RC environments. Rediff uses PhantomJS backed by Horseman to crawl pages. It takes a screenshot for every defined spec per viewport per environment.

#### Sample configuration file
```javascript
module.exports = {
  project: 'project name',
  // Default timeout passed to Horseman instance constructor (optional)
  timeout: 5000,
  // Absolute path to spec directory (for images and report file)
  specsDir: __dirname + '/specs/',
  // Absolute path to results directory
  resultsDir: __dirname + '/../results/',
  // CSS file path, used to hide often changing DOM elements (optional)
  cssFile: __dirname + '/exclude.css',

  environments: {
    current: {
      // Production environment url
      baseUrl: 'https://www.google.com/'
    },
    candidate: {
      // In most cases testprod environment url
      baseUrl: 'https://www.google.no/'
    }
  },

  viewports: {
    desktop: {
      // Viewport size
      width: 1280,
      height: 1024,
      // Materialize icon name (http://materializecss.com/icons.html) used by rediff-viewer
      icon: 'desktop_mac',
      // User Agent (optional)
      userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) (...)'
    },
    mobile: {
      width: 320,
      height: 240,
      icon: 'phone_iphone',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) (...)'
    }
  }
};
```

#### Sample spec file:
```javascript
// specs/login.js
module.exports = {
    // Path is concatenated with the corresponding environment's baseUrl
    path: 'login',
    // Limit viewports to these listed below (optional)
    viewports: ['mobile'],
    /**
     * Horseman actions (optional)
     * @see {@link https://github.com/johntitus/node-horseman|node-horseman}
     * @returns Promise
     */
    run: function() {
        return this
            .waitForSelector('#login-form')
            .wait(500);
    }
};
```
