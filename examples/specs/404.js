'use strict';

module.exports = {
    path: 'non-existent-path',
    run: async page => {
        /**
         * page variable is Puppeteer's page object
         * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
         */
        await page.waitForSelector('body');
    },
};
