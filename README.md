# Rediff
Rediff is a visual comparison tool used to quickly catch differences between production and RC environments. Rediff uses a [secondary service](https://github.com/Schibsted-Tech-Polska/nojs.sucks) with [puppeteer](https://github.com/GoogleChrome/puppeteer) for taking screenshots. Project allows for defining multiple testing environments with different viewport size and user agent. It takes a screenshot for every defined spec per viewport per environment.

## Configuration

* `concurrency` <[string]> Number of concurrent tasks (:warning: Task is a single test, assuming you have 3 environments defined, rediff would make 6 requests to [nojs.sucks](https://github.com/Schibsted-Tech-Polska/nojs.sucks)).
* `cssFile` <[string]> Path to the css file (for additional styles).
* `environments` <[Object]>
  * `current` <[Object]>
    * `baseUrl` <[string]> Address to production instance (:warning: if your site redirects to https make sure you pass address with https or site scripts may not be loaded due to mixed content browser error, this also applies to candidate).
  * `candidate` <[Object]>
    * `baseUrl` <[string]> Address to release candidate instance.
* `nojsSucksBaseUrl` <[string]> Address of [nojs.sucks](https://github.com/Schibsted-Tech-Polska/nojs.sucks) instance.
* `project` <[string]> Project name.
* `resultsDir` <[string]> Path to the output directory.
* `specsDir` <[string]> Path to the directory with tests.
* `viewports` <[Object]>
  * `<environment name>`
    * height <[number]> Viewport height.
    * width <[number]> Viewport width.
    * icon <[string]> Icon name from [materializecss](http://materializecss.com/icons.html).
    * userAgent <[string]> User agent.

### Sample configuration file

```javascript
module.exports = {
    concurrency: 1,
    cssFile: __dirname + '/exclude.css'
    environments: {
        current: {
            baseUrl: 'https://www.google.com/',
        },
        candidate: {
            baseUrl: 'https://www.google.com/', // in most cases candidate baseUrl should be different than current baseUrl
        },
    },
    nojsSucksBaseUrl: 'http://localhost:3000',
    project: 'project name',
    resultsDir: __dirname + '/public/results/',
    specsDir: __dirname + '/specs/',
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
};
```

## Specs

Each spec represents one tests. The test will be performed for all declared environments.

* `path` <[string]> Path added to candidate or current baseUrl.
* `run` <[Function]> By default [nojs.sucks](https://github.com/Schibsted-Tech-Polska/nojs.sucks) will trigger `run` function when there are no more than 2 network connections for at least 500 ms or 5000 ms have passed. The function will get as a parameter [puppeteer's](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page) `page` object.

### Sample spec file

```javascript
// specs/404.js
module.exports = {
    path: '#!/some-path',
    run: async page => {
        await page.waitFor(4000);
    }
};
```

### Useful hints

* you can inject and execute script on the page by using [puppeteer's](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args) `page.evaluate` method.

## CSS

Css file allows you to override site css.

### Useful hints

* Sometimes identical images may be considered different, this might help:

```css
img {
    image-rendering: pixelated;
}
```

* You can also mock img src:

```css
.some-class {
    content: url("data:image/jpeg;base64, iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
}
```

* To disable animations (no guarantees here, but is should work in most scenarios) you can:

```css
.some-class {
    animation-duration: 0s !important;
    animation: none !important;
    opacity: 1 !important;
    transition-duration: 0s !important;
    transition: unset !important;
}
```

[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "Boolean"
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "Number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "String"