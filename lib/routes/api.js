let async = require('async');
let router = require('express').Router();
let db = require('../DBhandler');
let auth = require('../auth');
let mailer = require('../mailer');
let validator = require('../inputvalidation');
let cfg = require('../../config');
let csv = require('../csv');

const { promisify } = require('util');
const unusedSuccessorToken = promisify(db.getUnusedSuccessorToken);

router.post('/register', validator.registration, function(req, res) {
  const data = validator.escapeHtml(req.body);
  data.dsgvo = new Date(); // signup date = dsgvo acceptance date

  // update DB entry with data from request
  // user is automatically removed from waitlist via sql trigger!
  db.insertUser(data, function(err) {

    if (err) return res.status(500).end('Fehler: ' + err);
    res.end('Erfolgreich angemeldet!');
    // send mail with confirmation mail
    mailer.sendRegistrationMail(data, function(err) {
      if (err) console.error('could not send registration mail:', err);
    });

    // send money exchange mails, if the user registered from a waitlist token
    mailer.sendMoneyTransfer(data.token, function(err) {
      if (err) console.error('could not send moneyexchange mail:', err);
    });
  });
});

router.post('/waitlist', validator.waitlist, function(req, res) {
  const { email } = validator.escapeHtml(req.body);

  db.insertWaitlist(email, async function(err) {
    try {
      if (err) return res.status(501).end('Fehler: ' + err);

      // when free tokens were not redeemed, give one to the new subscriber
      const nothingScheduled = !mailer.waitlistSchedule.length;
      const freeTokens = await unusedSuccessorToken(cfg.year);
      if (nothingScheduled && freeTokens.length) {
        const token = freeTokens[0].token;
        mailer.sendWaitlistNotification(email, token, (mailErr) => {
          if (mailErr) return console.error('mailfehler: ' + mailErr);
          console.log(`instantly sent notification with token ${token} to new subscriber`);
        });
      }

      res.end(email + ' erfolgreich zur Warteliste hinzugefügt.');
    } catch (error) {
      console.error(error);
      if (!res.headersSent) res.status(501).end('Fehler: ' + error);
    }
  });
});

router.post('/optout', validator.optout, function(req, res) {
  const data = validator.escapeHtml(req.body);
  db.optoutUser(data.token, data.email, function(err, newToken) {
    if (err) return res.status(403).end('Fehler: ' + err);
    res.end('Erfolgreich abgemeldet!');

    // send email to waitlist
    mailer.scheduleWaitlistNotification(newToken, function(err) {
      if (err) return console.error('could not send waitlist mail:', err);
      console.log('token ' + newToken + ' sent to waitlist!');
    });
  });
});

// require basic authentication on all following routes
router.use(auth);

// return list of all users, including unused tokens
router.get('/users', (req, res) => dbRequest(req, res, db.getUsers));

// return list of attending users
router.get('/users/attending', (req, res) => dbRequest(req, res, db.getAttendees));

// return list of nachrückers
router.get('/users/from-waitlist', (req, res) => dbRequest(req, res, db.getSuccessors));

// return list of users that have opted out
router.get('/users/opted-out', (req, res) => dbRequest(req, res, db.getOptouts));

// return list of unused tokens
router.get('/users/unused', (req, res) => dbRequest(req, res, db.getUnusedToken));

// return list of users that are not from the waitlist
router.get('/users/regular', (req, res) => dbRequest(req, res, db.getRegulars));

// return list of all users on waitlist as downloadable File
router.get('/waitlist', (req, res) => dbRequest(req, res, db.getWaitlist));

// return timestamps for scheduled waitlist notification mails
router.get('/waitlist/scheduled', (req, res) => res.json(mailer.waitlistSchedule));

// return statistics about the database
router.get('/statistics', function(req, res) {
  db.getCounts(req.query.year || cfg.year, function(err, counts) {
    counts.waitlistScheduled = mailer.waitlistSchedule.length;
    handleResponse(req, res, counts || err);
  });
});

// return statistics about the participants' gender
router.get('/statistics/:aspect', function(req, res) {
  db.getCountsByColumn(req.params.aspect, req.query.year || cfg.year, function(err, counts) {
    handleResponse(req, res, counts || err);
  });
});

// generate [amount] new tokens
router.get('/generateTokens/:amount', function(req, res) {
  db.createTokens(req.params.amount, function(err, tokens) {
    handleResponse(req, res, tokens || err);
  });
});

// wrapper for routes, that only wrap a single db query
function dbRequest(req, res, dbFunction) {
  dbFunction(req.query.year || cfg.year, (err, result) => {
    handleResponse(req, res, result || err);
  });
}

function handleResponse(req, res, data) {
  if (data instanceof Error) {
    console.error(data);
    const errMsg = cfg.send_errors ? data.toString() : 'Internal Server Error';
    return res.status(501).end(errMsg);
  }

  const format = req.query.format || 'json';
  // add download headers to any response,
  // if the param "download" is present in the query
  if (req.query.download !== undefined) {
    const filename = req.path.slice(1).replace(/\//g, '_') + '.' + format;
    res.append('Content-Disposition', 'attachment; filename=' + filename);
  }

  // convert to csv if format=csv is present in the query
  if (format === 'csv') {
    if (!data.length) data.push({'empty': 'no data'});
    res.append('Content-Type', 'text/csv').send(csv(data));
  } else {
    res.json(data);
  }
}

module.exports = router;
