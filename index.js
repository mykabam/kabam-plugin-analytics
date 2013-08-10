var url = require('url'),
  transientAnalytics = require('./lib/transientAnalytics'),
  persistentAnalytics = require('./lib/persistentAnalytics');

exports.model = {
  Total: require('./models/total').modelFactory,
  TotalMinute: require('./models/totalMinute').modelFactory
};

exports.core = function(mwc) {
  var hostUrl = mwc.config.hostUrl ? mwc.config.hostUrl : 'localhost',
    site = url.parse(hostUrl).host;

  mwc.analytics = {};

  mwc.analytics.transientAnalytics = transientAnalytics;
  mwc.analytics.transientAnalytics.useRedis(mwc.redisClient);

  mwc.analytics.transientAnalytics.site = site;

  mwc.analytics.persistentAnalytics = persistentAnalytics;
};

exports.middleware = function(mwc) {
  return mwc.analytics.transientAnalytics.store;
};

exports.routes = function(mwc) {
  mwc.app.get('/analytics/hotpixel.png', function(request, response) {
    response.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.set('Pragma', 'no-cache');
    response.set('Expires', 0);
    response.sendfile('./public/img/hotpixel.png');
  });
};
