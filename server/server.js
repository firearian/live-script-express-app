// import dependencies and initialize express
const { Hocuspocus } = require("@hocuspocus/server");
const { Redis } = require("@hocuspocus/extension-redis");
const { Database } = require("@hocuspocus/extension-database");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Logger } = require("@hocuspocus/extension-logger");
const { Doc } = require("yjs");
require("dotenv").config();

// Environment Variables Validation
// Confirm all environmental variables are present
const requiredEnv = [
  "DB_PREFIX",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_HOSTNAME",
  "DB_NAME",
  "COLLECTION_NAME",
  "REDIS_URI",
  "REDIS_PORT",
];
requiredEnv.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Environment variable ${variable} is required!`);
  }
});

const uri = `${process.env.DB_PREFIX}${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOSTNAME}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const MDBclient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // poolSize option is not supported in the free MongoDB versions
  // poolSize: 10,
});

let collection;
MDBclient.connect().then((client) => {
  const db = client.db(process.env.DB_NAME);
  collection = db.collection(process.env.COLLECTION_NAME);
});

const server = new Hocuspocus({
  port: 3001,
  extensions: [
    new Redis({
      host: process.env.REDIS_URI,
      port: process.env.REDIS_PORT,
      priority: 10000,
      onChange: async ({ documentName }) => {
        console.log("Redis Fetch called");
      },
    }),
    new Database({
      // Return a Promise to retrieve data …
      fetch: async ({ documentName }) => {
        try {
          const document = documentName
            ? await collection.findOne({ name: documentName })
            : null;
          const data = document?.data?.buffer;
          console.log("Mongo DB Data fetched: ", data);
          return document ? data : null;
        } catch (error) {
          console.error("Error fetching data from MongoDB", error);
          return null;
        }
      },

      // … and a Promise to store data:
      store: async ({ documentName, state }) => {
        try {
          await collection.updateOne(
            { name: documentName },
            { $set: { name: documentName, data: state } },
            { upsert: true }
          );
          console.log("Mongo DB Data stored: ", documentName);
        } catch (error) {
          console.error("Error storing data to MongoDB", error);
        }
      },
    }),
    new Logger(),
  ],

  async connected() {
    console.log("connections:", server.getConnectionsCount());
  },

  async onDisconnect() {
    const users = server.getConnectionsCount();
    console.log("connections:", users);
  },

  async onDestroy() {
    MDBclient.close();
  },
});

server.listen();

module.exports = server;
