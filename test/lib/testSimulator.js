var supertest = require('supertest'),
  http = require('http'),
  async = require('async'),
  moment = require('moment'),
  expressUseragent = require('express-useragent'),
  kabamKernel = require('kabam-kernel');

var uaStrings = [
  'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1.16) Gecko/20111108 Iceweasel/3.5.16 (like Firefox/3.5.16)',
  'Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
];

var testSimulator = {};
var site = 'localhost';

var urls = [
  '/page0/test1',
  '/page0/test2',
  '/test3',
  '/page1/test4',
  '/page2/test5'
];

var hits = 0,
  minute,
  pages = {},
  browsers = {},
  versions = {},
  oses = {},
  platforms = {};

var incCounter = function(items, item) {
  if (items.hasOwnProperty(item)) {
    items[item] = items[item] + 1;
  } else {
    items[item] = 1;
  }
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

testSimulator.getRandomUrl = function() {
  return urls[getRandomInt(0, urls.length - 1)];
};

testSimulator.getRandomUserAgent = function() {
  return uaStrings[getRandomInt(0, uaStrings.length - 1)];
};

testSimulator.randomRequest = function(app) {
  var rndUrl = testSimulator.getRandomUrl(),
    url = '/analytics/' + site + '/hotpixel.png',
    ua = testSimulator.getRandomUserAgent();

  var uao = expressUseragent.parse(ua);
  if (uao != null) {
    incCounter(browsers, uao.Browser);
  }

  incCounter(pages, rndUrl);

  return supertest(app)
    .get(url)
    .set('referer', rndUrl)
    .set('user-agent', ua);
};

testSimulator.runOnce = function(app, cb) {

  if (minute === 'undefined') {
    minute = moment().format('YYYYMMDDHHmm');
  }

  testSimulator
    .randomRequest(app)
    .end(function(err, res) {
      if (err) {
        throw err;
      }
      hits = hits + 1;
      if (typeof cb === 'function') {
        cb();
      };
    });
};

testSimulator.runMany = function(app, x, cb) {

  var tasks = [];
  minute = moment().format('YYYYMMDDHHmm');
  var run = function(runcb) {
    testSimulator.runOnce(app, runcb);
  };

  for (var i = 0; i < x; i++) {
    tasks.push(run);
  }
  async.parallel(tasks, function(err, results) {
    if (typeof cb === 'function') {
      cb(err);
    };
  });
};

testSimulator.testServerFactory = function() {
  var config = require('./../config.json').development,
    kabam = kabamKernel(config);
  kabam.usePlugin(require('./../../index'));
  kabam.start();
  return kabam;
};

testSimulator.statistics = function() {
  return {
    hits: hits,
    minute: minute,
    pages: pages,
    browsers: browsers,
    versions: versions,
    oses: oses,
    platforms: platforms
  };
};

module.exports = exports = testSimulator;
