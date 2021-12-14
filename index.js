require('dotenv').config();
const debug = require('debug')('snisrdc:backups');
const pptr = require('puppeteer-core');

const fs = require('fs');
const https = require('https');
const URL = require('url');
const path = require('path');

const sleep = (seconds) => new Promise(
  (resolve) => { setTimeout(() => resolve(), seconds * 1000); },
);

// main
(async () => {
  debug('starting puppeteer from', process.env.CHROME_BIN);
  const browser = await pptr.launch({ executablePath: process.env.CHROME_BIN, headless: true });
  const page = await browser.newPage();
  await page.goto('https://manager.baosystems.com/');

  // add username
  await page.type('#loginDiv > div:nth-child(2) > input[type=text]', process.env.BAO_USERNAME, { delay: 10 });

  // add password
  await page.type('#loginDiv > div:nth-child(3) > input:nth-child(1)', process.env.BAO_PASSWORD, { delay: 10 });

  // click on login button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('.blueSubmit'),
  ]);

  debug('sleeping 5 seconds');

  // sleep for 5 seconds
  await sleep(5);

  debug('selecting SNISRDC.com');

  // select the snisrdc.com server
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('ul.ng-scope:nth-child(1) > li:nth-child(1) > div:nth-child(7) > a:nth-child(1)'),
  ]);

  await sleep(8);

  debug('selecting backup link');

  // select the latest backup link
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('div.infoArea:nth-child(6) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > a:nth-child(1)'),
  ]);

  await sleep(8);

  debug('downloading the backup...');

  const link = await page.$eval('.instanceDetails > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > div:nth-child(2) > div:nth-child(2) > a:nth-child(1)', (element) => element.href);

  debug('got the link:', link);

  // parse the link to get the filename
  const { search } = URL.parse(link);
  const filename = path.parse(link.replace(search, '')).base;

  debug('Saving to file:', filename);

  // downloading
  await new Promise((resolve, reject) => {
    https.get(link, (res) => {
      const stream = fs.createWriteStream(filename);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });

      stream.on('error', (err) => {
        debug('An error occurred in downloading', err);
        reject(err);
      });
    });
  });

  debug('done!');

  await browser.close();
})();
