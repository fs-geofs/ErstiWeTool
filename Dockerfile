FROM node:12-alpine

#RUN apk --no-cache --virtual .build add build-base python git

RUN apk update && apk upgrade --no-cache

# taken from node:6-onbuild
#RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy in main package.json and yarn.lock
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

RUN yarn install --pure-lockfile --production
RUN yarn add full-icu

COPY . /usr/src/app

ENV NODE_ICU_DATA=node_modules/full-icu
ENV NODE_ENV production
CMD [ "yarn", "start" ]
