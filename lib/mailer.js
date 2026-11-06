var async = require('async');
var nodemailer = require('nodemailer');
var cook = require('handlebars');
var fs = require('fs');
var moment = require('moment');
var cfg = require('../config');
var db = require('./DBhandler');
var renderMarkdown = require('./markdown');

moment.locale('de');
cook.registerHelper('dateFormat', (date, format) => moment(date).format(format));

/**
 * Sends an Email generated from the given options. Options have the following structure
 * { templateName, templateLocals, subject, toAddress }
 */
function sendMail(options, callback) {
  fs.readFile(__dirname + '/mail-templates/' + options.templateName, {encoding: 'utf-8'}, function (err, template) {
    if (err) return callback(err);

    var markdown = cook.compile(template)(options.templateLocals);

    renderMarkdown(markdown).then(function(html) {
      var transporter = nodemailer.createTransport(cfg.mailer);
      transporter.sendMail({
        to: options.toAddress,
        cc: options.ccAddress,
        bcc: options.bccAddress,
        subject: options.subject,
        from: cfg.mailer.from,
        html: html
      }, callback);
    }).catch(callback);
  });
}

exports.sendRegistrationMail = function(userData, callback) {
  userData.year = cfg.year;
  userData.dates = cfg.dates;
  sendMail({
    templateName: 'post_registration.md',
    templateLocals: userData,
    subject: 'Anmeldung zum Ersti-Wochenende ' + cfg.year,
    toAddress: userData.email
  }, callback);
};

exports.sendMoneyTransfer = function(newToken, callback) {
  var locals = {}, newUserMail, oldUserMail;
  db.getUsers(cfg.year, function(err, users) {
    if (err) return callback('error getting users: ' + err);
    locals.newUser = users.find(el => (el.token === newToken));

    // no need to send the mails if prev_user is undefined
    if (!locals.newUser['prev_user']) return callback(null);

    locals.oldUser = users.find(el => (el.token === locals.newUser['prev_user']));
    locals.attendee_cost = cfg.attendee_cost;

    oldUserMail = {
      templateName: 'moneytransfer_olduser.md',
      templateLocals: locals,
      subject: 'Nachrücker für deinen Platz am Ersti-Wochenende ' + cfg.year,
      toAddress: locals.oldUser.email
    };

    newUserMail = {
      templateName: 'moneytransfer_newuser.md',
      templateLocals: locals,
      subject: 'Teilnehmerbeitrag für das Ersti-Wochenende ' + cfg.year,
      toAddress: locals.newUser.email
    };

    async.parallel([
      async.apply(sendMail, oldUserMail),
      async.apply(sendMail, newUserMail)
    ], callback);
  });
};

/**
 * send a token to a user or list of users
 * @param {*} email comma separated list of email adresses
 * @param {*} token
 * @param {*} callback
 */
exports.sendWaitlistNotification = function(email, token, callback) {
  sendMail({
    templateName: 'waitlist_notification.md',
    templateLocals: { token: token },
    subject: 'Freier Platz für das Ersti-Wochenende ' + cfg.year + '!',
    toAddress: cfg.mailer.from,
    bccAddress: email,
  }, callback);
};

// will contain moment()s of scheduled waitlist notifications for API
exports.waitlistSchedule = [];

exports.scheduleWaitlistNotification = function(token, callback) {
  const scheduledAt = randomTimeout(0.5, 5);
  let errVip = undefined;
  exports.waitlistSchedule.push({ scheduledAt, token });

  // send the mail randomly in the next 30min-8h to non VIPs on the waitlist
  setTimeout(function() {
    db.getWaitlist(cfg.year, function(err, waitlist) {
      // delete all scheduled times that have passed (eg the one we are currently handling)
      exports.waitlistSchedule = exports.waitlistSchedule
        .filter(({ scheduledAt }) => (moment().diff(scheduledAt) <= 0));

      if (err) return callback('error getting waitlist: ', err);

      // only recipients that are not on the whitelist
      const recipients = waitlist
        .map(el => el.email)
        .filter(el => !cfg.waitlistwhitelist.includes(el))
        .join(',');

      if (recipients.length) {
        exports.sendWaitlistNotification(recipients, token, (err, res) => {
          // @HACK also return error from previously running VIP email
          if (errVip) return callback(errVip)
          if (err) return callback(err)
          return callback(null, res)
        });
      }
    });
  }, scheduledAt.diff(moment())).unref(); // get milliseconds from now on

  // send a mail in 10 minutes for VIPs from config
  setTimeout(function() {
    db.getWaitlist(cfg.year, function(err, waitlist) {
      if (err) return callback('error getting waitlist: ', err);

      const recipients = waitlist
        .map(el => el.email)
        .filter(el => cfg.waitlistwhitelist.includes(el))
        .join(',');

      if (recipients.length) {
        exports.sendWaitlistNotification(recipients, token, err => {
          errVip = err;
        });
      }
    });
  }, scheduledAt.subtract(15, 'minutes').diff(moment())).unref(); // 15 minutes earlier
};

// returns a moment() of the scheduled time,
// which is min-max hours in the future.
function randomTimeout(min, max) {
  const eventDate = moment(cfg.dates.begin);
  const now = moment();

  // is the event closer than 40h? -> send after 30min
  if (eventDate.diff(now, 'h', true) < 40)
    return now.add(30, 'm');

  let timeout = Math.random() * (max - min);
  timeout = Math.floor((timeout + min) * 3600000); // scale hours to millisec
  const t = now.add(timeout, 'ms');

  const h = t.hour();
  if (h < 22 && h > 9) // resulting date is not at night? -> use it
    return t;
  else // otherwise add the duration of the night to bridge it
    return t.add(11, 'h');
}
