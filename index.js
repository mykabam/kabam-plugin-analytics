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
  mwc.app.get(/^\/analytics\/([\/0-9a-z\.]+)\/hotpixel.png$/, function(request, response) {
    //we react on site name like this
    /*
     /analytics/somesite.org/mega/hotpixel.png -> somesite.org/mega
     /analytics/somesite.org/hotpixel.png -> somesite.org
     /analytics/localhost/hotpixel.png -> localhost
    */

    var siteName = request.params[0]; // this is sitename parsed from url, we can process it
    var referrerUrl = request.header('Referer'); //http://expressjs.com/api.html#req.get


    //for hotpixels referer is USUALLY the URL of page, where it is placed,
    //if referrer DO NOT INCLUDE siteName - means somebody placed referrer on 3rd party site to fake the statistics

    var refregex=new RegExp('/'+siteName+'/','i');
    if(refregex.test(referrerUrl)){
      //this is correct hotpixel
    } else {
      //this is cheating!
    }


    response.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.set('Pragma', 'no-cache');
    response.set('Expires', 0);
    response.set('Etag', 'imageNOTtoBECachedInBrowser'+Math.floor(Math.random()*1000)+'='+(new Date().getTime()));
    response.sendfile(__dirname + '/public/img/hotpixel.png');
  });
};
