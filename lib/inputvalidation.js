const validator = require('node-validator');
const sanitizeHtml = require('sanitize-html');

const shorterThan50 = validator.isString({
  regex: /^(?=.{1,50}$).+$/,
  message: 'firstname must be shorter than 50 characters.'
});

const checkRegistration = validator.isObject()
  .withRequired('token', validator.isString({
    regex: /^\S{8}$/,
    message: 'token must be alphanumeric and 8 characters.'
  }))
  .withRequired('matrikel', validator.isString({
    regex: /^\S{6}$/,
    message: 'matrikel must be 6 numbers.'
  }))
  .withRequired('email', validator.isString({
    regex: /^(?=.{1,50}$)\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }))
  .withRequired('firstname', shorterThan50)
  .withRequired('lastname', shorterThan50)
  .withRequired('birthday', validator.isString({
    regex: /^[12][90][7890]\d-[01]\d-[0-3]\d$/,
    message: 'birthday must be in the format yyyy-mm-dd and between 1970 and 2999'
  }))
  .withRequired('phone', shorterThan50)
  .withRequired('food', validator.isString({
    regex: /^(vegan|vegetarisch|fleischig)$/,
    message: 'invalid value for food (one of vegan, vegetarisch, fleischig).'
  }))
  .withRequired('drinks', validator.isString({
    regex: /^(alcoholic|non-alcoholic)$/,
    message: 'invalid value for drinks (one of alcoholic, non-alcoholic).'
  }))
  .withRequired('gender', validator.isString({
    regex: /^(male|female|other)$/,
    message: 'invalid value for gender (one of male, female, other).'
  }))
  .withRequired('study', validator.isString({
    regex: /^(Geoinformatik|Zwei-Fach-Bachelor|Geographie|Landschaftsökologie)$/,
    message: 'invalid value for study (one of Geoinformatik, Zwei-Fach-Bachelor, Geographie, Landschaftsökologie).'
  }))
  .withRequired('dsgvo', validator.isString({
    regex: /^(on)$/,
    message: 'invalid value for datenschutzerklaerung. It needs to be accepted!'
  }))
  .withOptional('comment');

const checkOptout = validator.isObject()
  .withRequired('token', validator.isString({
    regex: /^\S{8}$/,
    message: 'token must be aplhanumeric and 8 characters.'
  }))
  .withRequired('email', validator.isString({
    regex: /^\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }));

const checkWaitlist = validator.isObject()
  .withRequired('email', validator.isString({
    regex: /^\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }))
  .withRequired('dsgvo', validator.isString({
    regex: /^(on)$/,
    message: 'invalid value for datenschutzerklaerung. It needs to be accepted!'
  }));

const sanitizeUserInput = function(data) {
  Object.keys(data).forEach((key) => {
    const val = data[key];
    data[key] = sanitizeHtml(val);
  });
  return data;
}

module.exports = {
  escapeHtml: sanitizeUserInput,
  registration: validator.express(checkRegistration),
  waitlist: validator.express(checkWaitlist),
  optout: validator.express(checkOptout)
};
