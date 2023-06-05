// import dependencies and initialize express
const express = require("express");
const expressWebsockets = require("express-ws");
const { Hocuspocus } = require("@hocuspocus/server");
const { Redis } = require("@hocuspocus/extension-redis");
const { Logger } = require("@hocuspocus/extension-logger");
const { Database } = require("@hocuspocus/extension-database");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Doc } = require("yjs");
const uri =
  "mongodb+srv://live-script-admin:7RaPPIv2nCVPiNvAE@live-script.5ukrnfl.mongodb.net/?retryWrites=true&w=majority";
const dbName = "live-script";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const MDBclient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const server = new Hocuspocus({
  extensions: [
    new Logger(),
    new Redis({
      // [required] Hostname of your Redis instance
      // [required] Port of your Redis instance
      host: "redis://:aXAGpyN5MSADhMpU0Nlh6s3QJ5U3ekW2@redis-16855.c296.ap-southeast-2-1.ec2.cloud.redislabs.com:16855",
      port: 16855,
      priority: 10000,
      // tls: {
      //   rejectUnauthorized: false,
      //   requestCert: true,
      // },
    }),
    new Database({
      // Return a Promise to retrieve data …
      fetch: async ({ documentName }) => {
        await MDBclient.connect();
        const db = MDBclient.db(dbName);
        const collection = db.collection("live-script-documents");
        const document = await collection.findOne({ name: documentName });
        MDBclient.close();
        console.log("Mongo DB Data fetched: ", document?.data);
        return document ? document.buffer : null;
      },
      // … and a Promise to store data:
      store: async ({ documentName, state }) => {
        await MDBclient.connect();
        const db = MDBclient.db(dbName);
        const collection = db.collection("live-script-documents");
        await collection.updateOne(
          { name: documentName },
          { $set: { name: documentName, data: state } },
          { upsert: true }
        );
        console.log("Mongo DB Data stored: ", documentName);
        MDBclient.close();
      },
    }),
  ],
  port: 3001,
  async onChange(data) {},
  async onLoadDocument(documentName) {
    await MDBclient.connect();
    const db = MDBclient.db(dbName);
    const collection = db.collection("live-script-documents");
    const document = await collection.findOne({
      name: documentName.documentName,
    });
    MDBclient.close();
    console.log("Mongo DB Data fetched onload: ", document?.data);
    return document.buffer || new Doc();
  },
  async connected() {
    console.log("test");
    console.log(this);
    console.log("connections:", server.getConnectionsCount());
  },
  async onDisconnect() {
    const users = server.getConnectionsCount();
    console.log("connections:", users);
  },
});

server.listen();

module.exports = server;
