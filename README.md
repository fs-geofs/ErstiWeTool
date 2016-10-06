# ErstiWeTool
Prototype of ErstiWeTool in nodejs express framework.

## Installation
Requires `node >= 4.x` and `mysql-server`.

```bash
git clone https://github.com/SpeckiJ/ErstiWeTool.git
cd ErstiWeTool
npm install
mysql -u root -p < schema.sql
echo "SET PASSWORD FOR 'ersti-we' = PASSWORD('my pass word here')" | mysql -u root -p
cp config.sample.js config.js
```

Now open `config.js` and configure the application to your likings

You now can start the app by running `npm start`.

## TODO
- Adminpanel frontend `admin.pug`
- Add "create admin.htpasswd" file to installation instructions
- landingpage `#info` styling as alert/toast/..
- Token export
- User export
- improve landingpage styling
- query für nachrücker auflistung
- improve delayed email sending times
    - nicht nachts
    - spätestens am abend vor fahrtbeginn?
- systemd script for autostart

## DONE
- improve registration mail template
    - teilnehmerbeitrag aus config übernehmen
    - hinweis für nachrücker: perso wird geprüft
- registration disclaimers:
    - du bist 18 jahre alt (wird vor fahrtantritt geprüft!)
    - auf dem wochenende wird gefilmt!
