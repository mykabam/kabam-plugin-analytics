var url = require('url'),
  useragent = require('express-useragent'),
  transientAnalytics = require('./lib/transientAnalytics'),
  persistentAnalytics = null;

exports.model = {
  Total: require('./models/total').modelFactory,
  TotalMinute: require('./models/totalMinute').modelFactory
};

exports.middleware = [
  function(mwc) {
    return useragent.express();
  },
  function(mwc) {
    var hostUrl = mwc.config.hostUrl ? mwc.config.hostUrl : 'http://localhost',
      site = url.parse(hostUrl).host;

    transientAnalytics.useRedis(mwc.redisClient);
    // persistentAnalytics = require('./lib/persistentAnalytics');
    return transientAnalytics.store;
  }
];

exports.routes = function(mwc) {
  mwc.app.get('/analytics/:site/hotpixel.png', function(request, response) {
    response.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.set('Pragma', 'no-cache');
    response.set('Expires', 0);
    response.sendfile(__dirname + '/public/img/hotpixel.png');
  });
};
