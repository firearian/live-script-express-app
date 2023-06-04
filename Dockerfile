FROM node:18-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY server ./server
COPY public ./public
RUN npm install

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

CMD ["npm", "start"]
