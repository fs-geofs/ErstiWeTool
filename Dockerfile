FROM node:12-alpine

#RUN apk --no-cache --virtual .build add build-base python git

# taken from node:6-onbuild
#RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy in main package.json and yarn.lock
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

RUN yarn install --pure-lockfile --production

COPY . /usr/src/app

ENV NODE_ENV production
CMD [ "yarn", "start" ]
