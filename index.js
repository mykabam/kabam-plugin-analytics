var useragent = require('express-useragent'),
  transientAnalytics = require('./lib/transientAnalytics'),
  persistentAnalytics = require('./lib/persistentAnalytics');

exports.model = {
  Total: require('./models/total').modelFactory,
  TotalMinute: require('./models/totalMinute').modelFactory
};

exports.core = {
  transientAnalytics: transientAnalytics,
  persistentAnalytics: persistentAnalytics
};

exports.middleware = [
  function(mwc) {
    persistentAnalytics.initializeModels(mwc.model.Total, mwc.model.TotalMinute);
    persistentAnalytics.startTimer(2000);
    return useragent.express();
  },
  function(mwc) {
    transientAnalytics.useRedis(mwc.redisClient);
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
