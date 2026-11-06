const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const moment = require('moment');
const validator = require('../lib/inputvalidation');
const csv = require('../lib/csv');
const renderMarkdown = require('../lib/markdown');

function validRegistration(extra) {
  return Object.assign({
    token: 'ABCD1234',
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
    comment: 'keine'
  }, extra);
}

function runMiddleware(middleware, body) {
  return new Promise((resolve) => {
    const req = { body: body };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(payload) {
        this.payload = payload;
        resolve({ status: this.statusCode, body: payload, next: false });
      }
    };
    middleware(req, res, () => resolve({ status: 200, body: null, next: true }));
  });
}

test('registration accepts a complete form and rejects unknown fields', async () => {
  const ok = await runMiddleware(validator.registration, validRegistration());
  assert.equal(ok.next, true);

  const extra = await runMiddleware(validator.registration, validRegistration({ state: 'free' }));
  assert.equal(extra.status, 400);
  assert.equal(extra.body.errors[0].message, 'Unexpected value.');
  assert.equal(extra.body.errors[0].parameter, 'state');
});

test('registration reports the same field messages as before', async () => {
  const result = await runMiddleware(validator.registration, validRegistration({
    token: 'short',
    food: 'pizza',
    dsgvo: 'off'
  }));
  assert.equal(result.status, 400);
  const messages = result.body.errors.map((error) => error.message);
  assert.ok(messages.includes('token must be alphanumeric and 8 characters.'));
  assert.ok(messages.includes('invalid value for food (one of vegan, vegetarisch, fleischig).'));
  assert.ok(messages.includes('invalid value for datenschutzerklaerung. It needs to be accepted!'));
});

test('waitlist and optout validation', async () => {
  assert.equal((await runMiddleware(validator.waitlist, { email: 'a@b.de', dsgvo: 'on' })).next, true);
  assert.equal((await runMiddleware(validator.waitlist, { email: 'not-an-email', dsgvo: 'on' })).status, 400);
  assert.equal((await runMiddleware(validator.optout, { token: 'ABCD1234', email: 'a@b.de' })).next, true);
  const missing = await runMiddleware(validator.optout, { token: 'ABCD1234' });
  assert.equal(missing.body.errors[0].message, 'Required value.');
});

test('escapeHtml strips markup from form fields', () => {
  const data = validator.escapeHtml({
    firstname: 'Ada',
    comment: '<script>alert(1)</script>hello'
  });
  assert.equal(data.firstname, 'Ada');
  assert.equal(data.comment.includes('<script>'), false);
  assert.match(data.comment, /hello/);
});

test('csv output keeps the previous to-csv layout', () => {
  const output = csv([
    { name: 'Ada', note: 'hello, "world"' },
    { name: 'Bea', note: null }
  ]);
  assert.equal(output, 'name,note\nAda,"hello, \\"world\\""\r\nBea,\r\n');
});

test('registration mail still renders German dates, the table, and mailto links', async () => {
  moment.locale('de');
  handlebars.registerHelper('dateFormat', (date, format) => moment(date).format(format));
  const source = fs.readFileSync(path.join(__dirname, '../lib/mail-templates/post_registration.md'), 'utf8');
  const markdown = handlebars.compile(source)({
    firstname: 'Heinz',
    lastname: 'Kjuni',
    year: 2016,
    token: 'ABCD1234',
    birthday: '1994-04-02',
    study: 'Geoinformatik',
    food: 'vegan',
    drinks: 'alcoholic',
    comment: 'nuesse',
    dates: {
      begin: '2016-10-28T09:30:00+02',
      end: '2016-10-30T13:00:00+02'
    }
  });
  const html = await renderMarkdown(markdown);
  assert.match(html, /Hallo Heinz/);
  assert.match(html, /28\. Oktober/);
  assert.match(html, /09:30 Uhr/);
  assert.match(html, /<table>/);
  assert.match(html, /ABCD1234/);
  assert.match(html, /<a href="mailto:fsgi@uni-muenster\.de\?subject=Erstiwochenende%202016">fsgi@uni-muenster\.de<\/a>/);
  assert.equal(html.includes('](mailto:'), false);
});
