var should = require('should'),
  redis = require('redis'),
  moment = require('moment'),
  testSimulator = require('./lib/testSimulator');

describe('transientAnalytics', function() {

  var transientAnalytics;

  before(function() {
    transientAnalytics = require('./../lib/transientAnalytics');
    transientAnalytics.site = 'localhost';
  });

  describe('#getInstance()', function() {

    it('should be a transientAnalytics object', function() {
      should.exists(transientAnalytics);
      transientAnalytics.should.be.a('object');
      transientAnalytics.should.have.property('site').with.a('string');
      transientAnalytics.should.have.property('useRedis').with.a('function');
    });

    it('should be a singleton', function() {
      var transientAnalytics2 = require('./../lib/transientAnalytics');
      transientAnalytics.test = 'CaseA';
      should.exists(transientAnalytics2.test);
      transientAnalytics2.test.should.equal('CaseA');
    });

  });

  describe('#useRedis()', function() {

    var redisClient;

    it('should produce error if not configured', function(done) {
      transientAnalytics.getTotal(function(err, total) {
        should.exists(err);
        err.should.equal('Redis is not configured');
        done();
      });
    });

    it('should not produce error if using correct redisClient', function(done) {
      redisClient = redis.createClient();
      transientAnalytics.useRedis(redisClient);
      transientAnalytics.getTotal(function(err, total) {
        should.not.exists(err);
        should.exists(total);
        done();
      });
    });

  });

  describe('#configureRedis()', function() {

    before(function() {
      // unset redisClient
      try {
        transientAnalytics.useRedis(undefined);
      } catch (e) {
      }
    });

    it('should produce error if not configured', function(done) {
      transientAnalytics.getTotal(function(err, total) {
        should.exists(err);
        err.should.equal('Redis is not configured');
        done();
      });
    });

    it('should produce error if using wrong host / port', function(done) {
      transientAnalytics.configureRedis(80, 'localhost');
      transientAnalytics.getTotal(function(err, total) {
        should.exists(err);
        err.should.equal('Redis connection gone from end event.');
        done();
      });
    });

    it('should not produce error if using correct host / port', function(done) {
      transientAnalytics.configureRedis(6379, 'localhost');
      transientAnalytics.getTotal(function(err, total) {
        should.not.exists(err);
        should.exists(total);
        done();
      });
    });

  });


  describe('#getTime()', function() {

    it('should return current time (within 1 second accuracy)', function () {
      var now = moment().format('YYYYMMDDHHmmss'),
        time = transientAnalytics.getTime();
      now.should.equal(time);
    });

  });

  describe('#getTimeAsync()', function() {

    it('should return current time (within 1 second accuracy)', function (done) {
      var now = moment().format('YYYYMMDDHHmmss');
      transientAnalytics.getTimeAsync(function (err, time) {
        now.should.equal(time);
        done();
      });
    });

  });

  describe('#store()', function() {
    it('store');
  });

  describe('#storeMiddleware()', function() {
    it('storeMiddleware');
  });

  describe('#getTotal()', function() {
    var mwc;
    it('getTotal', function(done) {
      mwc = testSimulator.testServerFactory();
      testSimulator.runMany(mwc.app, 10);
      done();
    });
  });

  describe('#getData()', function() {
    it('getData');
  });

  describe('#getPages()', function() {
    it('getPages');
  });

  describe('#getTotalMinute()', function() {
    it('getTotalMinute');
  });

  describe('#getDataMinute()', function() {
    it('getDataMinute');
  });

  describe('#getPagesMinute()', function() {
    it('getPagesMinute');
  });

  describe('#totalBySecondTaskFactory()', function() {
    it('totalBySecondTaskFactory');
  });

  describe('#browserTaskFactory()', function() {
    it('browserTaskFactory');
  });

  describe('#pageTaskFactory()', function() {
    it('pageTaskFactory');
  });

  describe('#broadcastFactory()', function() {
    it('broadcastFactory');
  });

});
