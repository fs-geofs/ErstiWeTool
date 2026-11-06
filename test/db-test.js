var async = require('async');
var db = require('../DBhandler.js');
var cfg = require('../config.js');

var userData = {
  email: Math.random().toString(36).slice(2, 8) + '@asdf.de',
  firstname: 'Heinz',
  lastname: 'Kjuni',
  gender: 'male',
  phone: '09823487345',
  birthday: '1994-04-02',
  study: 'Zwei-Fach-Bachelor',
  food: 'vegan',
  comment: ''
};

db.connect();

async.series([
  //async.apply(insertTest),
  //async.apply(optoutTest)
  async.apply(db.getCounts, 2016)
], function(err, results) {
  if (err) console.error(err);
  console.log(results);
  process.exit();
});

function insertTest(done) {
  async.series([
    async.apply(db.insertWaitlist, userData.email),
    async.apply(db.insertWaitlist, userData.email),
    function(next) {
      db.createTokens(1, function(err, tokens) {
        if (err) return next(err);
        console.log(tokens);
        userData.token = tokens[0];
        next();
      });
    },
    async.apply(db.insertUser, userData),
    function(next) {
      db.getUsers(cfg.year, function(err, users) {
        if (err) return next(err);
        console.log(users);
        next();
      });
    },
    function(next) {
      db.getWaitlist(cfg.year, function(err, waitlist) {
        if (err) return next(err);
        console.log('waitlist should be empty. length: ', waitlist.length);
        next();
      });
    },
    async.apply(db.insertUser, userData)
  ], function(err, result) {
    console.error('should throw error: ' + (err === 'invalid token'));
    done();
  });
};


function optoutTest(done) {
  async.series([
    function(next) {
      db.optoutUser(userData.token, userData.email, function(err, newToken) {
        console.log(newToken);
        userData.token = newToken;
        userData.email = 'noerw@gmx.de';
        next(err, newToken);
      });
    },
    async.apply(db.insertUser, userData),
    async.apply(db.getUsers, cfg.year)
  ], done);
}
