mwc_plugin_analytics
====================

Analytics MWC Plugin


Example,  how we can made this module

```javascript
exports.extendCore = function(core){
 core.analitycs=........;
}

exports.extendMiddleware = function(core){
  
  function(request, response, next){
     core.analytics.logUrl(request.originalUrl, request.ip, request.user,function(err){
       if(err) throw err;
       next();
     });
   };

};


exports.setRoutes = function(core){

  core.app.get( '/hotpixel/:id' , function(request,response){
     core.analytics.logHotPixel(request.params.id, request.ip, request.user,function(err){
       if err throw err;
       response.sendfile('pixel.jpg);
      });
  });

}
```
