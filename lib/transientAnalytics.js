
/*jshint multistr:true, evil:true*/
var fs = require('fs'),
  redis = require('redis'),
  moment = require('moment'),
  async = require('async'),
  _s = require('underscore.string');

var transientAnalyticsSingleton = (function () {

  // reference to the Singleton
  var instance;
  var scripts = [];

  var scriptLoader = function(scriptName, callback) {

    if (!scripts[scriptName]) {
      scripts[scriptName] = false;
    } else {
      callback(undefined, scripts[scriptName]);
      return;
    }

    fs.readFile(__dirname + "/../scripts/" + scriptName + ".lua", "utf-8", function(err, script) {
      if (err) {
        callback(err, undefined);
        return;
      }

      scripts[scriptName] = script;
      callback(err, script);
    });
  };

  function init(port, host) {
    var client = null;
    port = (typeof port === 'undefined') ? null : port;
    host = (typeof host === 'undefined') ? null : host;

    return {
      // public property
      site: 'localhost',

      /**
       * @ngdoc function
       * @name transientAnalytics.configureRedis
       * @param {number=} port Redis port number
       * @param {string=} host Redis hostname
       */
      configureRedis: function (port, host) {
        port = (typeof port === 'undefined') ? null : port;
        host = (typeof host === 'undefined') ? null : host;

        if (client && client.quit && typeof client.quit === 'function' ) {
          client.quit();
        }

        client = redis.createClient(port, host);

        client.on('error', function (error) {
          console.error(error.message);
        });
      },

      /**
       * @ngdoc function
       * @name transientAnalytics.useRedis
       * @param {RedisClient} redisClient Redis client instance
       */
      useRedis: function(redisClient) {
        client = redisClient;
        client.on('error', function (error) {
          console.error(error.message);
        });
      },

      store: function (req) {
        var page = req.path,
          site,
          ip = req.ip,
          browser = req.useragent.Browser,
          os = req.useragent.OS,
          platform = req.useragent.Platform,
          version = req.useragent.Version,
          userid = 'anonymous',
          time = moment().format('YYYYMMDDHHmmss');

        if (page.slice(0, 11) === '/analytics/' && page.slice(-13) === '/hotpixel.png') {
          site = page.slice('/analytics/'.length, '/hotpixel.png'.length * -1);
        }

        if (!client) {
          console.error('Redis isn\'t configured');
          return;
        }

        if (!site) {
          console.error('Site is not valid!');
          return;
        }

        // capture originalUrl from GET request paramater if available
        if (req.query && req.query.originalUrl) {
          page = req.query.originalUrl;
        } else if (req.get('referer')) {
          page = req.get('referer');
        } else {
          page = 'unknown';
        }

        browser = _s.classify(browser);
        platform = _s.classify(platform);
        version = _s.classify(version);
        os = os.replace(/[\(\)]/, '', 'gi');
        os = _s.classify(os);

        client.sadd('anl:site', site);
        client.sadd('anl:sitepage:' + site, page);
        client.sadd('anl:browser', browser);
        client.sadd('anl:os', os);
        client.sadd('anl:platform', platform);
        client.sadd('anl:version', version);
        client.sadd('anl:ip', ip);
        client.sadd('anl:userid', userid);

        // total
        client.incr('anl:' + site);

        // total / time
        client.incr('anl:' + site + ':' + time);

        //page
        client.incr('anl:' + site + ':' + page + ':total');

        //page / time
        client.incr('anl:' + site + ':' + page + ':time:' + time);

        // browser
        client.incr('anl:' + site + ':browser:' + browser);
        client.incr('anl:' + site + ':browser:' + browser + ':time:' + time);

        // os
        client.incr('anl:' + site + ':os:' + os);
        client.incr('anl:' + site + ':os:' + os + ':time:' + time);

        // platform
        client.incr('anl:' + site + ':platform:' + platform);
        client.incr('anl:' + site + ':platform:' + platform + ':time:' + time);

        // version
        client.incr('anl:' + site + ':version:' + version);

        //userid
        client.incr('anl:' + site + ':userid:' + userid);
        client.incr('anl:' + site + ':userid:' + userid + ':time:' + time);

        // ip
        client.incr('anl:' + site + ':ip:' + ip);
        client.incr('anl:' + site + ':ip:' + ip + ':time:' + time);
        client.incr('anl:' + site + ':' + page + ':ip:' + ip);
        client.incr('anl:' + site + ':' + page + ':ip:' + ip + ':time:' + time);
        client.incr('anl:' + site + ':' + page + ':ip:' + ip + ':userid:' + userid + ':time:' + time);
      },

      storeMiddleware: function (req, res, next) {
        instance.store(req);
        next();
      },

      /**
       * @ngdoc function
       * @name transientAnalytics.getTime
       * @return {string} String time with format 'YYYYMMDDHHmmss'
       */
      getTime: function () {
        return moment().format('YYYYMMDDHHmmss');
      },

      /**
       * @ngdoc function
       * @name transientAnalytics.getTimeAsync
       * @param {function} callback callback function with arguments: function(err, time)
       */
      getTimeAsync: function (callback) {
        var time = instance.getTime();
        if (callback !== undefined) {
          callback(null, time);
        }
      },

      /**
       * @ngdoc function
       * @name transientAnalytics.getTotal
       * @param {function} callback callback function with arguments: function(err, total)
       */
      getTotal: function (callback) {
        if (!client) {
          if (callback !== undefined) {
            callback('Redis is not configured', undefined);
          }
          return;
        }
        client.get('anl:' + instance.site, function (err, total) {
          if (callback !== undefined) {
            if (!total) {
              callback(err, 0);
            } else {
              callback(err, parseInt(total, 10));
            }
          }
        });
      },

      // dataType: ['browser', 'platform', 'os', 'ip', 'version', 'userid']
      getData: function (dataType, callback) {
        if (!client) {
          callback('Redis is not configured', undefined);
          return;
        }
        scriptLoader('getData', function(err, script) {
          if (err) {
            throw new Error(err);
          }
          client.eval(script, 1, 'anl:' + dataType, dataType, instance.site, function (err, items) {
            var len = items.length;
            var item = {};
            if (len === 0) {
              callback(new Error('Unrecognized data type'), null);
              return;
            } else if (len % 2 === 1) {
              items.push(0);
              len = items.length;
            }
            for (var i=0; i<len/2; i+=1) {
              if (items[i] !== 'Unknown' || items[i+len/2] != 0) {
                item[items[i]] = (items[i+len/2] === 'Unknown') ? 0 : items[i+len/2];
              }
            }
            if (callback !== undefined) {
              callback(err, item);
            }
          });
        });
      },

      getBrowsers: function (callback) {
        instance.getData('browser', callback);
      },

      getVersions: function (callback) {
        instance.getData('version', callback);
      },

      getOperatingSystems: function (callback) {
        instance.getData('os', callback);
      },

      getPlatforms: function (callback) {
        instance.getData('platform', callback);
      },

      getIPs: function (callback) {
        instance.getData('ip', callback);
      },

      getPages: function (callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }

        scriptLoader('getPages', function(err, script) {
          if (err) {
            throw new Error(err);
          }
          client.eval(script, 0, instance.site, function (err, pages) {
            if (err) {
              throw new Error(err);
            }
            var pagesobj = {};
            var len = pages.length;
            for (var i=0; i<len/2; i+=1) {
              pagesobj[pages[i]] = pages[i+len/2];
            }
            if (callback !== undefined) {
              callback(err, pagesobj);
            }
          });
        });

      },

      getTotalMinute: function (minute, callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }
        scriptLoader('getTotalMinute', function(err, script) {
          if (err) {
            throw new Error(err);
          }
          client.eval(script, 1, 'anl:' + instance.site + ':' + minute + '*', function (err, total) {
            if (callback !== undefined) {
              callback(err, total);
            }
          });
        });
      },

      getDataMinute: function (dataType, minute, callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }
        scriptLoader('getDataMinute', function(err, script) {

          client.eval(script, 1, 'anl:' + dataType, dataType, instance.site, minute, function (err, items) {
            var len = items.length;
            var item = {};
            if (len === 0) {
              callback(new Error('Unrecognized data type'));
              return;
            }
            for (var i=0; i<len/2; i+=1) {
              item[items[i]] = items[i+len/2];
            }
            if (callback !== undefined) {
              callback(err, item);
            }
          });
        });
      },

      getBrowserMinute: function (minute, callback) {
        instance.getDataMinute('browser', minute, callback);
      },

      getOperatingSystemMinute: function (minute, callback) {
        instance.getDataMinute('os', minute, callback);
      },

      getPlatformMinute: function (minute, callback) {
        instance.getDataMinute('platform', minute, callback);
      },

      getPagesMinute: function (minute, callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }
        scriptLoader('getPagesMinute', function(err, script) {
          client.eval(script, 0, instance.site, minute, function (err, pagetable) {
            var pages = {};
            for (var i=0; i<pagetable.length; i+=1) {
              pages[pagetable[i]] = pagetable[i+1];
              i += 1;
            }
            if (callback !== undefined) {
              callback(err, pages);
            }
          });
        });
      },

      totalBySecondTaskFactory: function (time) {
        return function (callback) {
          if (!client) {
            callback('Redis not configured', undefined);
          }
          client.get('anl:' + instance.site + ':' + time, function (err, total) {
            if (callback !== undefined) {
              callback(err, total);
            }
          });
        };
      },

      browserTaskFactory: function (callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }
        client.smembers('anl:browser', function (err, members) {
          var browserQueries = [], i;

          function makeFunc(brw) {
            return function (callback) {
              if (!client) {
                callback('Redis not configured', undefined);
              }
              client.get('anl:' + instance.site + ':browser:' + brw, function (err, brwcount) {
                callback(err, brwcount);
              });
            };
          }

          for (i = 0; i < members.length; i += 1) {
            browserQueries.push(makeFunc(members[i]));
          }

          async.parallel(browserQueries, function (err, results) {
            var browsers = {};
            for (i = 0; i < members.length; i += 1) {
              browsers[members[i]] = results[i];
            }
            callback(err, browsers);
          });
        });
      },

      pageTaskFactory: function (callback) {
        if (!client) {
          callback('Redis not configured', undefined);
        }
        client.keys('anl:' + instance.site + ':*:total', function (err, keys) {
          var pages = [], i;

          function makeFunc(page) {
            return function (callback) {
              client.get(page, function (err, pgcount) {
                callback(err, pgcount);
              });
            };
          }

          for (i = 0; i < keys.length; i += 1) {
            pages.push(makeFunc(keys[i]));
          }

          async.parallel(pages, function (err, results) {
            var data = [],
                i, re,
                keyparts,
                page;

            for (i = 0; i < keys.length; i += 1) {
              page = {};
              re = new RegExp('^anl:' + instance.site + ':(.+):total$');
              keyparts = re.exec(keys[i]);
              if (keyparts !== null) {
                page.name = keyparts[1];
                page.pgcount = results[i];
                data.push(page);
              } else {
                console.error('Error: ' + keys[i]);
              }
            }
            callback(err, data);
          });
        });
      },

      broadcastFactory: function (sockets) {
        return function broadcast(callback) {
          async.parallel(
            [instance.getTimeAsync,
             instance.getTotal,
             instance.browserTaskFactory,
             instance.pageTaskFactory,
             instance.totalBySecondTaskFactory(instance.getTime())
            ],
            function (err, results) {
              sockets.in('dashboard').emit('send:dashboard', {time: results[0],
                                                              total: results[1],
                                                              browsers: results[2],
                                                              pages: results[3],
                                                              current: results[4]});
              callback();
            }
          );
        };
      },

      /**
       * @ngdoc function
       * @name transientAnalytics.deleteAll
       * @param {function} callback callback function when done: function(err)
       * @description Delete all redis data on default site
       */
      deleteAll: function (callback) {
        if (!client) {
          callback('Redis is not configured', undefined);
          return;
        }

        scriptLoader('deleteAll', function(err, script) {
          if (err) {
            throw new Error(err);
          }
          client.eval(script, 1, 'anl:' + instance.site + '*', function (err) {
            if (err) {
              throw new Error(err);
            }
            if (callback !== undefined) {
              callback(undefined);
            }
          });
        });
      }

    };
  }

  return {
    // get instance if exists, create one if doesn't

    getInstance: function () {

      if (!instance) {
        instance = init();
      }

      return instance;
    }
  };

}());

module.exports = transientAnalyticsSingleton.getInstance();
