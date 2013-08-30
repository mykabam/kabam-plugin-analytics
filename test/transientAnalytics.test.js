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

  describe('Storing and Retrieving Data', function() {

    this.timeout(4000);
    var kabamKernel;
    var statistics;

    before(function(done) {

      transientAnalytics.deleteAll(function(err) {
        if (err) {
          throw new Error(err);
        }
        kabamKernel = testSimulator.testServerFactory();
        testSimulator.runMany(kabamKernel.app, 50, function() {
          statistics = testSimulator.statistics();

          // give time for the server to finish processing requests
          setTimeout(done, 1000);
        });
      });
    });

    after(function(done) {
      transientAnalytics.deleteAll(function(err) {
        if (err) {
          throw new Error(err);
        }
        done();
      });
    });

    describe('#store()', function() {
      it('store');
    });

    describe('#storeMiddleware()', function() {
      it('storeMiddleware');
    });

    describe('#getTotal()', function() {

      it('getTotal should return the total hits', function(done) {
        transientAnalytics.getTotal(function(err, total) {
          if (err) {
            throw new Error(err);
          }
          total.should.equal(statistics.hits);
          done();
        });
      });

    });

    describe('#getData()', function() {

      it('getData("ip") should return an object containing IP statistics', function(done) {
        transientAnalytics.getData('ip', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          data.should.be.eql({ '127.0.0.1': statistics.hits });
          done();
        });
      });

      it('getData("browser") should return an object containing browser statistics', function(done) {
        transientAnalytics.getData('browser', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          for (var prop in data) {
            data[prop].should.be.eql(statistics.browsers[prop]);
          }
          done();
        });
      });

      it.skip('getData("version") should return an object containing browser version statistics', function(done) {
        transientAnalytics.getData('version', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          for (var prop in data) {
            data[prop].should.be.eql(statistics.versions[prop]);
          }
          done();
        });
      });

      it('getData("platform") should return an object containing platform statistics', function(done) {
        transientAnalytics.getData('platform', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          for (var prop in data) {
            data[prop].should.be.eql(statistics.platforms[prop]);
          }
          done();
        });
      });

      it('getData("os") should return an object containing os statistics', function(done) {
        transientAnalytics.getData('os', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          for (var prop in data) {
            data[prop].should.be.eql(statistics.oses[prop]);
          }
          done();
        });
      });

    });

    describe('#getPages()', function() {
      it.skip('getPages should return an object containing hits statitics by page', function(done) {
        transientAnalytics.getPages(function(err, pageobj) {
          if (err) {
            throw new Error(err);
          }
          pageobj.should.eql(statistics.pages);
          done();
        });
      });
    });

    describe('#getTotalMinute()', function() {
      it.skip('getTotalMinute should return the total hits in a particular minute', function(done) {
        transientAnalytics.getTotalMinute(statistics.minute, function(err, total) {
          if (err) {
            throw new Error(err);
          }
          total.should.be.equal(statistics.hits);
          done();
        });
      });
    });

    describe('#getDataMinute()', function() {
      it('getDataMinute');
    });

    describe('#getPagesMinute()', function() {
      it.skip('getPagesMinute should return an object containing hits statitics by page in a particular minute',
         function(done) {
           transientAnalytics.getPagesMinute(statistics.minute, function(err, pageobj) {
             if (err) {
               throw new Error(err);
             }
             pageobj.should.be.eql(statistics.pages);
             done();
           });
         });
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

    describe('#deleteAll()', function() {

      it.skip('should delete all data', function(done) {
        transientAnalytics.deleteAll(function(err) {
          should.not.exists(err);
          transientAnalytics.getTotal(function(err2, total) {
            if (err2) {
              throw new Error(err2);
            }
            total.should.be.equal(0);
            done();
          });
        });
      });

    });

  });

});
