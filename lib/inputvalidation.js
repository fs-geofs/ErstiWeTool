const sanitizeHtml = require('sanitize-html');

function isString(options) {
  return {
    validate(value, onError) {
      if (value === null || value === undefined) {
        return onError('Required value.');
      }
      if (typeof value !== 'string') {
        return onError('Incorrect type. Expected string.');
      }
      if (options && options.regex && !options.regex.test(value)) {
        return onError(options.message || 'Invalid value. Value must match required pattern.');
      }
      return null;
    }
  };
}

function isObject() {
  const rules = {};

  const validator = {
    withRequired(name, childValidator) {
      rules[name] = { required: true, validator: childValidator };
      return validator;
    },
    withOptional(name, childValidator) {
      rules[name] = { validator: childValidator };
      return validator;
    },
    validate(value, onError) {
      if (value === null || value === undefined) {
        return onError('Required value.');
      }
      if (typeof value !== 'object') {
        return onError('Incorrect type. Expected object.');
      }

      for (const parameter of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(rules, parameter)) {
          onError('Unexpected value.', parameter, value[parameter]);
        }
      }

      for (const parameterName of Object.keys(rules)) {
        const parameterValue = value[parameterName];
        const rule = rules[parameterName];

        if ((parameterValue === undefined || parameterValue === null) && rule.required) {
          onError('Required value.', parameterName, parameterValue);
          continue;
        }

        if (parameterValue === undefined || parameterValue === null || !rule.validator) {
          continue;
        }

        rule.validator.validate(parameterValue, function(message, childName, childValue) {
          const name = childName
            ? (childName[0] === '[' ? parameterName + childName : parameterName + '.' + childName)
            : parameterName;
          onError(message, name, childValue !== undefined ? childValue : parameterValue);
        });
      }
    }
  };

  return validator;
}

function expressMiddleware(check) {
  return function checkBody(req, res, next) {
    const errors = [];

    check.validate(req.body, function(message, childName, childValue) {
      errors.push({
        parameter: childName,
        value: childValue,
        message: message
      });
    });

    if (errors.length > 0) {
      res.status(400).send({ errors: errors });
      return;
    }
    next();
  };
}

const shorterThan50 = isString({
  regex: /^(?=.{1,50}$).+$/,
  message: 'firstname must be shorter than 50 characters.'
});

const checkRegistration = isObject()
  .withRequired('token', isString({
    regex: /^\S{8}$/,
    message: 'token must be alphanumeric and 8 characters.'
  }))
  .withRequired('matrikel', isString({
    regex: /^\S{6}$/,
    message: 'matrikel must be 6 numbers.'
  }))
  .withRequired('email', isString({
    regex: /^(?=.{1,50}$)\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }))
  .withRequired('firstname', shorterThan50)
  .withRequired('lastname', shorterThan50)
  .withRequired('birthday', isString({
    regex: /^[12][90][7890]\d-[01]\d-[0-3]\d$/,
    message: 'birthday must be in the format yyyy-mm-dd and between 1970 and 2999'
  }))
  .withRequired('phone', shorterThan50)
  .withRequired('food', isString({
    regex: /^(vegan|vegetarisch|fleischig)$/,
    message: 'invalid value for food (one of vegan, vegetarisch, fleischig).'
  }))
  .withRequired('drinks', isString({
    regex: /^(alcoholic|non-alcoholic)$/,
    message: 'invalid value for drinks (one of alcoholic, non-alcoholic).'
  }))
  .withRequired('gender', isString({
    regex: /^(male|female|other)$/,
    message: 'invalid value for gender (one of male, female, other).'
  }))
  .withRequired('study', isString({
    regex: /^(Geoinformatik|Zwei-Fach-Bachelor|Geographie|Landschaftsökologie)$/,
    message: 'invalid value for study (one of Geoinformatik, Zwei-Fach-Bachelor, Geographie, Landschaftsökologie).'
  }))
  .withRequired('dsgvo', isString({
    regex: /^(on)$/,
    message: 'invalid value for datenschutzerklaerung. It needs to be accepted!'
  }))
  .withOptional('comment');

const checkOptout = isObject()
  .withRequired('token', isString({
    regex: /^\S{8}$/,
    message: 'token must be aplhanumeric and 8 characters.'
  }))
  .withRequired('email', isString({
    regex: /^\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }));

const checkWaitlist = isObject()
  .withRequired('email', isString({
    regex: /^\S+@\S+$/,
    message: 'invalid email, must be shorter than 50 characters.'
  }))
  .withRequired('dsgvo', isString({
    regex: /^(on)$/,
    message: 'invalid value for datenschutzerklaerung. It needs to be accepted!'
  }));

function sanitizeUserInput(data) {
  Object.keys(data).forEach((key) => {
    const val = data[key];
    data[key] = sanitizeHtml(typeof val === 'string' ? val : String(val));
  });
  return data;
}

module.exports = {
  escapeHtml: sanitizeUserInput,
  registration: expressMiddleware(checkRegistration),
  waitlist: expressMiddleware(checkWaitlist),
  optout: expressMiddleware(checkOptout)
};
