const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'config.js');
const passwdPath = path.join(root, 'admin.htpasswd');
const enabled = process.env.ERSTI_DB === '1';
const port = Number(process.env.ERSTI_DB_PORT || 3307);
const dbHost = process.env.ERSTI_DB_HOST || '127.0.0.1';
const year = 2099;

let server;
let base;
let configBackup;
let passwdBackup;
let db;
const auth = 'Basic ' + Buffer.from('testadmin:testpass').toString('base64');

function request(method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, base);
    const req = http.request(url, { method, headers: headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  if (!enabled) return;
  configBackup = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
  passwdBackup = fs.existsSync(passwdPath) ? fs.readFileSync(passwdPath) : null;
  fs.writeFileSync(configPath, `
    module.exports = {
      http_port: 0,
      send_errors: true,
      year: ${year},
      attendee_cost: 40,
      dates: {
        begin: '2099-10-28T09:30:00+02',
        end: '2099-10-30T13:00:00+02'
      },
      mysql: {
        database: 'ersti-we',
        host: '${dbHost}',
        port: ${port},
        user: 'ersti-we',
        password: 'test',
        connectionlimit: 5
      },
      mailer: {
        jsonTransport: true,
        from: '"ErstiWe" <ersti@example.com>'
      },
      waitlistwhitelist: ['vip@example.com']
    };
  `);
  fs.writeFileSync(passwdPath, 'testadmin:testpass\n');

  const app = require('../lib/app');
  db = require('../lib/DBhandler');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (!enabled) return;
  if (server) {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
  if (db) await new Promise((resolve) => db.disconnect(resolve));
  if (configBackup) fs.writeFileSync(configPath, configBackup);
  else fs.rmSync(configPath, { force: true });
  if (passwdBackup) fs.writeFileSync(passwdPath, passwdBackup);
  else fs.rmSync(passwdPath, { force: true });
});

test('registration, waitlist, opt-out, statistics, and csv export', { skip: !enabled }, async () => {
  const mysql = require('mysql2/promise');
  const cleaner = await mysql.createConnection({
    database: 'ersti-we',
    host: dbHost,
    port: port,
    user: 'ersti-we',
    password: 'test'
  });
  await cleaner.query('UPDATE users SET prev_user = NULL WHERE year = ?', [year]);
  await cleaner.query('DELETE FROM users WHERE year = ?', [year]);
  await cleaner.query('DELETE FROM waitlist WHERE year = ?', [year]);
  await cleaner.end();

  const wait = await request('POST', '/api/waitlist', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=ada@example.com&dsgvo=on'
  });
  assert.equal(wait.status, 200, wait.body);
  assert.match(wait.body, /Warteliste/);

  const generated = await request('GET', '/api/generateTokens/1', {
    headers: { authorization: auth }
  });
  assert.equal(generated.status, 200, generated.body);
  const tokens = JSON.parse(generated.body);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].length, 8);

  const form = new URLSearchParams({
    token: tokens[0],
    matrikel: '123456',
    email: 'ada@example.com',
    firstname: 'Ada',
    lastname: 'Lovelace',
    birthday: '1994-04-02',
    phone: '0123456789',
    food: 'vegan',
    drinks: 'alcoholic',
    gender: 'female',
    study: 'Geoinformatik',
    dsgvo: 'on',
    comment: 'Nüsse & "Zitate"'
  }).toString();
  const registered = await request('POST', '/api/register', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form
  });
  assert.equal(registered.status, 200, registered.body);
  assert.match(registered.body, /Erfolgreich angemeldet/);

  const csv = await request('GET', '/api/users/attending?format=csv&download=1', {
    headers: { authorization: auth }
  });
  assert.equal(csv.status, 200, csv.body);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.headers['content-disposition'], /attachment/);
  assert.match(csv.body, /Ada/);
  assert.match(csv.body, /Nüsse/);

  const stats = await request('GET', '/api/statistics', {
    headers: { authorization: auth }
  });
  assert.equal(stats.status, 200, stats.body);
  const counts = JSON.parse(stats.body);
  assert.equal(counts.attendees, 1);
  assert.equal(counts.waitlist, 0);

  const optedOut = await request('POST', '/api/optout', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'token=' + tokens[0] + '&email=ada@example.com'
  });
  assert.equal(optedOut.status, 200, optedOut.body);
  assert.match(optedOut.body, /Erfolgreich abgemeldet/);

  const afterOptout = JSON.parse((await request('GET', '/api/statistics', {
    headers: { authorization: auth }
  })).body);
  assert.equal(afterOptout.optouts, 1);
  assert.equal(afterOptout.unused >= 1, true);

  await new Promise((resolve, reject) => {
    db.anonymizeUsers({ year: year }, (err) => (err ? reject(err) : resolve()));
  });
  const users = JSON.parse((await request('GET', '/api/users', {
    headers: { authorization: auth }
  })).body);
  assert.ok(users.every((user) => user.firstname === 'ANON' || user.firstname === null));
});
