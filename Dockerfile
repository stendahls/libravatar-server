FROM node:16-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

EXPOSE 4000

RUN npm i @stendahls/libravatar-server --only=production

COPY .env .env

CMD [ "./node_modules/.bin/libravatar-server" ]
