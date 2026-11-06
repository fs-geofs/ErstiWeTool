var path = require('path');
var express = require('express');
var helmet = require('helmet');
var moment = require('moment');

var routesFront = require('./routes/frontend');
var routesApi = require('./routes/api');
var db = require('./DBhandler');
var cfg = require('../config');

var app = express();

moment.locale('de');

// Init mysql connection
db.connect();

// harden server by sending certain headers.
// Inline scripts and onclick handlers are part of the existing pages,
// and the app is served over plain HTTP behind a reverse proxy,
// so those two defaults from Helmet stay compatible with the templates.
var contentSecurityPolicy = helmet.contentSecurityPolicy.getDefaultDirectives();
contentSecurityPolicy['upgrade-insecure-requests'] = null;
contentSecurityPolicy['script-src'] = ["'self'", 'https://code.jquery.com', "'unsafe-inline'"];
contentSecurityPolicy['script-src-attr'] = ["'unsafe-inline'"];

app.use(helmet({
  contentSecurityPolicy: {
    directives: contentSecurityPolicy
  }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.locals.year = cfg.year;
app.locals.dateBegin = moment(cfg.dates.begin).format('L');
app.locals.dateEnd = moment(cfg.dates.end).format('L');

app.use(express.urlencoded({ extended: false }));

// development request logger
if (app.get('env') === 'development') {
  app.use((req, res, next) => {
    console.log(
      req.header('authorization') || 'no auth header',
      req.ip, req.url, req.body
    );
    next();
  });
}

// All Routes
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', routesFront);
app.use('/api', routesApi);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
