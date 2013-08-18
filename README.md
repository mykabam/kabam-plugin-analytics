@ngdoc overview
@name mwc_plugin_analytics-guide
@description

Analytics MWC Plugin
====================

[![Stories in Ready](https://badge.waffle.io/mywebclass/mwc_plugin_analytics.png)](http://waffle.io/mywebclass/mwc_plugin_analytics)

Implemented:

Track regular http request with:

    http://[analytics.server]/analytics/[sitename]/hotpixel.png?originalUrl=[originalUrl]

Real-time storing in Redis

Summarize in MongoDB collection, updated every 20 seconds.

Responsibility guidelines
================
Every kabam plugin and package has the responsible developer. His duties are

1) Maintain the package - fix and found bugs from upgrading modules included or nodejs version change
2) React on bug reports
3) Accept/deny pull request.

The `Push` and `npm publish` privilege is the right of the `Responsible developer`, but the `fork` - is for everybody.

Responsible developer for this package is [T. Budiman](https://github.com/valmy)