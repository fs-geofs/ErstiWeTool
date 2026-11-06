const fs = require('fs');
const auth = require('http-auth');
const authConnect = require('http-auth-connect');
const path = require('path');

const passwdFile = path.join(__dirname, '../admin.htpasswd');
const passwdStat = fs.existsSync(passwdFile) ? fs.statSync(passwdFile) : null;
if (!passwdStat || !passwdStat.isFile()) {
  throw new Error(
    'admin.htpasswd must be a file before start. If Docker created a folder at that path, remove the folder and create the file with: htpasswd -c ./admin.htpasswd <username>'
  );
}

const basic = auth.basic({
  realm: 'ErstiWeTool',
  file: passwdFile
});

module.exports = authConnect(basic);
