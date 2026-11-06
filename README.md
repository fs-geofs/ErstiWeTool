# ErstiWeTool
Tool to manage a freshmans weekend by GEOFS.

## Installation
Requires [Node.js 26 LTS](https://nodejs.org/en/download/package-manager/), [`yarn`](https://yarnpkg.com/en/docs/install) 1.22 and `mysql-server ^5.7`. The container image is `node:26-alpine`.

```bash
git clone https://github.com/SpeckiJ/ErstiWeTool.git
cd ErstiWeTool
yarn install
mysql -u root -p < schema.sql
echo "SET PASSWORD FOR 'ersti-we' = PASSWORD('my pass word here')" | mysql -u root -p
cp config.js.sample config.js
```

Now open `config.js` and configure the application to your likings.

At last, create login credentials for the admin panel (requires `htpasswd` from apache-utils):
```
htpasswd -c ./admin.htpasswd <username>
```

## Run
You now can start the app by running `yarn start`.

There are two frontend endpoints:
- `./`:      contains the user facing forms
- `./admin`: contains an adminpanel, requires authentication

## Database via docker
```sh
# the root pw is set in docker-compose.yml
docker compose up -d mysql
docker compose exec mysql bash -c 'mysql --default-character-set=utf8 -p < schema.sql'
docker compose exec mysql bash -c "echo 'SET PASSWORD FOR \"ersti-we\" = PASSWORD(\"test\")' | mysql -p"
```

## run as service
### systemd
```bash
vi init/erstiwetool.service # change installation path
sudo cp init/erstiwetool.service /etc/systemd/system/
sudo systemctl enable erstiwetool
sudo systemctl start erstiwetool
```

### upstart
```bash
vi init/erstiwetool # change installation path
sudo cp init/erstiwetool /etc/init.d/
sudo update-rc.d erstiwetool defaults 98 02
sudo service erstiwetoolstart
```

## anonymize PII
Run `bin/anonymizeUsers [year] --yes-for-real` to replace user PII (first name, last name, email, phone) with placeholders. Birthdate is truncated to months.

## license
GPL-3.0
