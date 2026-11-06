const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'config.js');
const passwdPath = path.join(root, 'admin.htpasswd');

let server;
let base;
let configBackup;
let passwdBackup;
let db;

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
  configBackup = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
  passwdBackup = fs.existsSync(passwdPath) ? fs.readFileSync(passwdPath) : null;
  fs.copyFileSync(path.join(root, 'config.js.sample'), configPath);
  // Plain password works when the stored value and the password have the same length.
  fs.writeFileSync(passwdPath, 'testadmin:testpass\n');

  const app = require('../lib/app');
  db = require('../lib/DBhandler');
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await new Promise((resolve) => db.disconnect(resolve));
  if (configBackup) fs.writeFileSync(configPath, configBackup);
  else fs.rmSync(configPath, { force: true });
  if (passwdBackup) fs.writeFileSync(passwdPath, passwdBackup);
  else fs.rmSync(passwdPath, { force: true });
});

test('homepage shows the configured weekend dates', async () => {
  const res = await request('GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.body, /28\.10\.2016/);
  assert.match(res.body, /30\.10\.2016/);
  assert.match(res.body, /Mit Code anmelden/);
  const csp = res.headers['content-security-policy'];
  assert.match(csp, /https:\/\/code\.jquery\.com/);
  assert.equal(csp.includes('upgrade-insecure-requests'), false);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('static assets and unknown pages', async () => {
  const asset = await request('GET', '/js/index.js');
  assert.equal(asset.status, 200);
  assert.match(asset.body, /toggleView/);

  const missing = await request('GET', '/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.body, /Not Found/);
});

test('registration validation is returned as JSON for the form', async () => {
  const bad = await request('POST', '/api/register', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'token=short&dsgvo=off'
  });
  assert.equal(bad.status, 400);
  const parsed = JSON.parse(bad.body);
  assert.ok(parsed.errors.some((error) => error.message.includes('token must be alphanumeric')));

  const form = new URLSearchParams({
    token: 'ABCD1234',
    matrikel: '123456',
    email: 'ada@example.com',
    firstname: 'Ada',
    lastname: 'Lovelace',
    birthday: '1994-04-02',
    phone: '0123456789',
    food: 'vegan',
    drinks: 'non-alcoholic',
    gender: 'female',
    study: 'Landschaftsökologie',
    dsgvo: 'on',
    comment: 'hallo'
  }).toString();
  const accepted = await request('POST', '/api/register', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form
  });
  assert.notEqual(accepted.status, 400);
  assert.match(accepted.body, /Fehler:/);
});

test('admin routes ask for basic auth and accept the htpasswd user', async () => {
  const anonymous = await request('GET', '/api/users');
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers['www-authenticate'], /Basic/);

  const auth = 'Basic ' + Buffer.from('testadmin:testpass').toString('base64');
  const admin = await request('GET', '/admin', {
    headers: { authorization: auth }
  });
  assert.equal(admin.status, 200);
  assert.match(admin.body, /Statistiken/);
  assert.match(admin.body, /Token generieren/);
});
