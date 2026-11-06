FROM node:26-alpine

RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache tzdata \
    && npm install --global --allow-scripts=yarn yarn@1.22.22

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY . .

ENV TZ=Europe/Berlin
ENV NODE_ENV=production
CMD ["yarn", "start"]
