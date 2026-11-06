/**
 * Turns an array of objects into CSV text.
 * Matches the output of the previously used `to-csv` package:
 * a header line ending in `\n`, then rows ending in `\r\n`.
 * Fields that contain a comma, quote, or line break are wrapped in quotes,
 * and quotes inside those fields are escaped with a backslash.
 */
function needsEncapsulation(value) {
  if (!value) return false;
  const string = value.toString();
  return string.includes(',')
    || string.includes('\r')
    || string.includes('\n')
    || string.includes('"');
}

function encapsulate(value) {
  const escaped = value.toString().replace(/"/g, '\\"');
  return '"' + escaped + '"';
}

function toCsv(objects, opts) {
  if (typeof objects !== 'object' || objects === null) {
    throw new TypeError('expecting an array');
  }

  opts = typeof opts === 'object' && opts ? opts : {};
  const rows = Array.isArray(objects) ? objects.slice() : [objects];
  if (!rows.length) throw new Error('expecting at least one object');

  const headers = Object.keys(rows[0]);
  const buf = [];

  while (rows.length) {
    const object = rows.shift();
    const line = [];

    for (let i = 0; i < headers.length; i++) {
      const value = object[headers[i]];
      if (line.length) line.push(',');
      line.push(needsEncapsulation(value) ? encapsulate(value) : value);
    }

    buf.push(line.join(''));
    buf.push('\r\n');
  }

  const body = buf.filter(Boolean);
  if (opts.headers === false) return body.join('');
  return [headers.join(','), '\n'].concat(body).filter(Boolean).join('');
}

module.exports = toCsv;
