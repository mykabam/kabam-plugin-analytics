var useragent = require('express-useragent'),
  transientAnalytics = require('./lib/transientAnalytics'),
  persistentAnalytics = require('./lib/persistentAnalytics'),
  fs = require('fs');

var hotPixelString = fs.readFileSync(__dirname + '/public/img/hotpixel.png', {'encoding':'binary'});

exports.model = {
  Total: require('./models/total').modelFactory,
  TotalMinute: require('./models/totalMinute').modelFactory
};

exports.core = {
  transientAnalytics: transientAnalytics,
  persistentAnalytics: persistentAnalytics
};

exports.middleware = [
  function(kabamKernel) {
    persistentAnalytics.initializeModels(kabamKernel.model.Total, kabamKernel.model.TotalMinute);
    persistentAnalytics.startTimer(2000);
    return useragent.express();
  },
  function(kabamKernel) {
    transientAnalytics.useRedis(kabamKernel.redisClient);
    return transientAnalytics.storeMiddleware;
  }
];

exports.routes = function(kabamKernel) {
  kabamKernel.app.get(/^\/analytics\/([\/0-9a-z\.]+)\/hotpixel.png$/, function(request, response) {
    /*
     we react on site name like this:

     /analytics/somesite.org/mega/hotpixel.png -> somesite.org/mega
     /analytics/somesite.org/hotpixel.png -> somesite.org
     /analytics/localhost/hotpixel.png -> localhost

     Note: processing is handled in the middleware
     */

    response.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.set('Pragma', 'no-cache');
    response.set('Expires', 0);
    response.set('Etag', 'imageNOTtoBECachedInBrowser' + Math.floor(Math.random()*1000) + '=' + (new Date().getTime()));
    response.type('png');
    response.send(200, hotPixelString);
  });
};
