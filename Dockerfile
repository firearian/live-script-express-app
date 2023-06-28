FROM node:18-alpine

RUN mkdir /app
WORKDIR /app

RUN apk add --no-cache git \
    && git clone https://github.com/firearian/live-script-express-app .

COPY package.json .
COPY .env.example .
COPY server ./server
COPY public ./public
RUN npm install

ENV NODE_ENV production
ENV DB_NAME live-script
ENV COLLECTION_NAME live-script-documents
ENV DB_PREFIX mongodb+srv://
ENV DB_USERNAME live-script-admin
ENV DB_PASSWORD 7RaPPIv2nCVPiNvAE
ENV DB_HOSTNAME live-script.5ukrnfl.mongodb.net/?retryWrites=true&w=majority
ENV REDIS_URI redis://:aXAGpyN5MSADhMpU0Nlh6s3QJ5U3ekW2@redis-16855.c296.ap-southeast-2-1.ec2.cloud.redislabs.com:16855
ENV REDIS_PORT 16855
ENV WS_PORT 3001
ENV ADMIN admin@admin.com,admin
ENV USER user@user.com,user
ENV SECRET_KEY secret

ENV PORT 3001

EXPOSE 3001

CMD ["npm", "start"]
