var async = require('async'),
  moment = require('moment'),
  _ = require('underscore'),
  mongoose = require('mongoose'),
  Total,
  TotalMinute;

var persistentAnalyticsSingleton = (function () {

  var instance;

  function init() {

    var trAnl = require('./transientAnalytics');
    var intervalId;

    function syncTotal(callback) {
      trAnl.getTotal(function (err, data) {
        if (!err) {
          Total.update( { site: trAnl.site },
                        { timestamp: moment().toDate(),
                          hits: data },
                        { upsert: true },
                        callback );
        } else {
          callback(err, data);
        }
      });
    }

    function syncData(dataType, callback) {

      trAnl.getData(dataType, function (err, data) {
        if (!err) {
          // Detect new data type and add it to the schema
          for (var datum in data) {
            if (Total.schema.path(dataType + '.' + datum) === undefined) {
              var newschema = {};
              newschema[dataType] = {};
              newschema[dataType][datum] = 'number';
              Total.schema.add(newschema);
            }
          }

          var dataDefinition = { timestamp: moment().toDate() };
          dataDefinition[dataType] = data;

          Total.update(
            { site: trAnl.site },
            dataDefinition,
            { upsert: true },
            callback
          );

        } else {
          if (callback !== undefined) {
            callback(err, data);
          }
        }
      });
    }

    function syncBrowser(callback) {
      syncData('browser', callback);
    }

    function syncVersion(callback) {
      syncData('version', callback);
    }

    function syncOperatingSystem(callback) {
      syncData('os', callback);
    }

    function syncPlatform(callback) {
      syncData('platform', callback);
    }

    function syncIPAddresses(callback) {
      trAnl.getData('ip', function (err, ipAddresses) {
        if (!err) {
          // Find records
          Total.findOne({ site: trAnl.site }, function (err, total) {
            for (var ip in ipAddresses) {
              var ipobj = _.findWhere(total.ipAddresses, { ip: ip });
              if (ipobj) { // existing ip address: update hits
                var idx = total.ipAddresses.indexOf(ipobj);
                ipobj.hits = ipAddresses[ip];
                total.ipAddresses.set(idx, ipobj);
              } else { // new ip address
                total.ipAddresses.push({ ip: ip, hits: ipAddresses[ip] });
              }
            }
            total.save(callback);
          });

        } else {
          if (callback !== undefined) {
            callback(err, ipAddresses);
          }
        }
      });
    }

    function syncPage(callback) {
      trAnl.getPages(function (err, pages) {
        if (!err) {

          // Find records
          Total.findOne({ site: trAnl.site }, function (err, total) {
            for (var page in pages) {
              var pageobj = _.findWhere(total.pages, { page: page });
              if (pageobj) { // existing page: update hits
                var idx = total.pages.indexOf(pageobj);
                pageobj.hits = pages[page];
                total.pages.set(idx, pageobj);
              } else { // new page
                total.pages.push({ page: page, hits: pages[page] });
              }
            }
            total.save(callback);
          });

        } else {
          if (callback !== undefined) {
            callback(err, pages);
          }
        }
      });
    }

    function syncTotalMinute(callback) {
      var lastMinute = moment().subtract(1, 'minutes'),
          now = moment();

      function updateMinute(time, callback) {
        trAnl.getTotalMinute(time.format('YYYYMMDDHHmm'), function (err, data) {
          if (!err) {
            TotalMinute.update(
              { site: trAnl.site, time: time.format('YYYYMMDDHHmm'), jsdate: time.startOf('minute').toDate() },
              { timestamp: moment().toDate(),
                year: time.year(),
                month: time.month(),
                date: time.date(),
                hour: time.hour(),
                minute: time.minute(),
                hits: data },
              { upsert: true },
              callback
            );
          } else {
            console.log(err);
            callback(err, data);
          }
        });
      }

      updateMinute(now, function (err, data) {
        // make sure last minute data is complete
        if (now.second() <= 10) {
          updateMinute(lastMinute, function (err2, data2) {
            if (err2) {
              throw new Error(err2);
            }
            callback(err, data);
          });
        } else {
          callback(err, data);
        }
      });
    }

    function syncDataMinute(dataType, callback) {
      var lastMinute = moment().subtract(1, 'minutes'),
          now = moment();

      function updateMinute(time, callback) {
        trAnl.getDataMinute(dataType, time.format('YYYYMMDDHHmm'), function (err, items) {
          if (!err) {
            // Detect new item type and add it to the schema
            for (var item in items) {
              if (TotalMinute.schema.path(dataType + '.' + item) === undefined) {
                var newschema = {};
                newschema[dataType] = {};
                newschema[dataType][item] = 'number';
                TotalMinute.schema.add(newschema);
              }
            }

            var dataDefinition = {
              timestamp: moment().toDate(),
              year: time.year(),
              month: time.month(),
              date: time.date(),
              hour: time.hour(),
              minute: time.minute()
            };
            dataDefinition[dataType] = items;

            TotalMinute.update(
              { site: trAnl.site, time: time.format('YYYYMMDDHHmm'), jsdate: time.startOf('minute').toDate() },
              dataDefinition,
              { upsert: true },
              callback
            );
          } else {
            console.log(err);
            callback(err, items);
          }
        });
      }

      updateMinute(now, function (err, data) {
        if (err) {
          throw new Error(err);
        }
        // make sure last minute data is complete
        if (now.second() <= 10) {
          updateMinute(lastMinute, function (err2, data2) {
            if (err2) {
              throw new Error(err2);
            }
            callback(err, data);
          });
        } else {
          callback(err, data);
        }
      });
    }

    function syncBrowserMinute(callback) {
      syncDataMinute('browser', callback);
    }

    function syncOperatingSystemMinute(callback) {
      syncDataMinute('os', callback);
    }

    function syncPlatformMinute(callback) {
      syncDataMinute('platform', callback);
    }

    function syncPagesMinute(callback) {
      var lastMinute = moment().subtract(1, 'minutes'),
          now = moment();

      function updateMinute(time, callback) {
        trAnl.getPagesMinute(time.format('YYYYMMDDHHmm'), function (err, pages) {
          if (!err && pages !== null) {
            TotalMinute.findOne({ site: trAnl.site, time: time.format('YYYYMMDDHHmm') }, function (err, totalMinute) {
              if (!err && totalMinute !== null) {
                for (var page in pages) {
                  var pageobj = _.findWhere(totalMinute.pages, { page: page });
                  if (pageobj) { // existing page: update hits
                    var idx = totalMinute.pages.indexOf(pageobj);
                    pageobj.hits = pages[page];
                    totalMinute.pages.set(idx, pageobj);
                  } else { // new page
                    totalMinute.pages.push({ page: page, hits: pages[page] });
                  }
                }
                totalMinute.save(callback);
              } else {
                console.log('didn\'t get totalMinute');
              }
            });
          } else {
            console.log(err);
            callback(err, pages);
          }
        });
      }

      updateMinute(now, function (err, data) {
        if (err) {
          throw new Error(err);
        }

        // make sure last minute data is complete
        if (now.second() <= 10) {
          updateMinute(lastMinute, function (err2, data2) {
            if (err2) {
              throw new Error(err2);
            }
            callback(err, data);
          });
        } else {
          callback(err, data);
        }
      });
    }

    function syncIPAddressMinute(callback) {
      var lastMinute = moment().subtract(1, 'minutes'),
          now = moment();

      function updateMinute(time, callback) {
        trAnl.getPagesMinute(time.format('YYYYMMDDHHmm'), function (err, pages) {
          if (!err && pages !== null) {
            TotalMinute.findOne({ site: trAnl.site, time: time.format('YYYYMMDDHHmm') }, function (err, totalMinute) {
              if (!err && totalMinute !== null) {
                for (var page in pages) {
                  var pageobj = _.findWhere(totalMinute.pages, { page: page });
                  if (pageobj) { // existing page: update hits
                    var idx = totalMinute.pages.indexOf(pageobj);
                    pageobj.hits = pages[page];
                    totalMinute.pages.set(idx, pageobj);
                  } else { // new page
                    totalMinute.pages.push({ page: page, hits: pages[page] });
                  }
                }
                totalMinute.save(callback);
              } else {
                console.log('didn\'t get totalMinute');
              }
            });
          } else {
            console.log(err);
            callback(err, pages);
          }
        });
      }

      updateMinute(now, function (err, data) {
        // make sure last minute data is complete
        if (now.second() <= 10) {
          updateMinute(lastMinute, function (err2, data2) {
            if (err2) {
              throw new Error(err2);
            }
            callback(err, data);
          });
        } else {
          callback(err, data);
        }
      });
    }

    function store(callback) {
      var mainTasks = [
        syncTotal,
        syncTotalMinute
      ],
      tasks = [
        syncBrowser,
        syncOperatingSystem,
        syncPlatform,
        syncIPAddresses,
        syncPage,
        syncBrowserMinute,
        syncOperatingSystemMinute,
        syncPlatformMinute,
        syncPagesMinute
      ];

      async.parallel(mainTasks, function (err, data) {
        if (err) {
          throw new Error(err);
        }
        async.parallel(tasks, callback);
      });

    }

    return {
      initializeModels: function(total, totalMinute) {
        if (typeof total === 'undefined') {
          Total = mongoose.model('Total');
        } else {
          Total = total;
        }

        if (typeof totalMinute === 'undefined') {
          TotalMinute = mongoose.model('TotalMinute');
        } else {
          TotalMinute = totalMinute;
        }
      },

      startTimer: function (syncTime) {
        intervalId = setInterval(store, syncTime);
      },

      stopTimer: function () {
        clearInterval(intervalId);
      },

      minutely: function (start, end, callback) {
        start = (typeof start !== 'undefined') ? start : moment.unix(0).toDate();
        end = (typeof end !== 'undefined') ? end : moment().toDate();
        TotalMinute.find({jsdate: {$exists: true, $gte: start, $lte: end}},
                         {site: 1, jsdate: -1,  hits: 1, _id: 0},
                         { lean: true }).
          sort({jsdate: -1}).
          exec(callback);
      },

      total: function (req, res) {
        instance.minutely(null, null, function (err, data) {
          res.json(data);
        });
      }
    };
  }

  return {
    getInstance: function () {
      if (!instance) {
        instance = init();
      }

      return instance;
    }
  };
})();

module.exports = persistentAnalyticsSingleton.getInstance();
