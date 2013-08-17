var supertest = require('supertest'),
  http = require('http'),
  mwcKernel = require('mwc_kernel');

var uaStrings = [
  'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1.16) Gecko/20111108 Iceweasel/3.5.16 (like Firefox/3.5.16)',
  'Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
];

var testSimulator = {};
var site = 'testsite';

var urls = [
  '/page0/test1',
  '/page0/test2',
  '/test3',
  '/page1/test4',
  '/page2/test5'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

testSimulator.getRandomUrl = function() {
  return urls[getRandomInt(0, urls.length)];
};

testSimulator.getRandomUserAgent = function() {
  return uaStrings[getRandomInt(0, uaStrings.length)];
};

testSimulator.randomRequest = function(app) {
  var url = '/analytics/' + site + '/hotpixel.png?originalUrl=' + testSimulator.getRandomUrl(),
    ua = testSimulator.getRandomUserAgent();
  console.log(url, ua);
  return supertest(app)
    .get(url)
    .set('user-agent', ua);
};

testSimulator.runOnce = function(app) {
  testSimulator
    .randomRequest()
    .end(function(err, res) {
      if (err) {
        throw err;
      }
      console.log('run ');
    });
};

testSimulator.runMany = function(app, x) {
  for (var i = 0; i <= x; i++) {
    testSimulator.runOnce(app);
  }
};

testSimulator.testServerFactory = function() {
  var config = require('./../config.json').development,
    mwc = mwcKernel(config);
  var s = require('http');
  mwc.usePlugin(require('./../../index'));
  console.log(s instanceof http.constructor);
  mwc.start(http);
  return mwc;
};

module.exports = exports = testSimulator;
