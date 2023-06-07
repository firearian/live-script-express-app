// import dependencies and initialize express
const express = require("express");
const expressWebsockets = require("express-ws");
const { Hocuspocus, Server } = require("@hocuspocus/server");
const { Redis } = require("@hocuspocus/extension-redis");
const { Database } = require("@hocuspocus/extension-database");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Logger } = require("@hocuspocus/extension-logger");
const { Doc } = require("yjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Environment Variables Validation
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
// Confirm all environmental variables are present
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

const server = Server.configure({
  async onAuthenticate(data) {
    const { token } = data;
    console.log("Token: ", token);

    if (String(token)) {
      return;
    } else if (token === "readpass") {
      data.connection.readOnly = true;
      return;
    } else {
      throw new Error("Not authorized!");
    }
    // You can set contextual data to use it in other hooks
    // return {
    //   user: {
    //     id: 1234,
    //     name: "John",
    //   },
    // };
  },
  port: process.env.WS_PORT,
  extensions: [
    new Redis({
      host: process.env.REDIS_URI,
      port: process.env.REDIS_PORT,
      priority: 10000,
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

// Express instance using the express-ws extension
const { app } = expressWebsockets(express());
var corsOptions = {
  origin: "http://localhost:3000",
};
app.use(express.json());

app.use(cors(corsOptions));

verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({
      message: "No token provided!",
    });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized!",
      });
    }
    req.userId = decoded.id;
    next();
  });
};

// Basic http route
app.get("/", (request, response) => {
  response.send("What... Are you doing?");
});

// Basic http route
app.post("/api/login", (request, response) => {
  console.log("request: ", request.body);
  const user = request.body;
  if (user["email"] === "asdf@gmail.com" && user["password"]) {
    console.log("as");
    var token = jwt.sign({ id: user.id }, process.env.SECRET_KEY, {
      expiresIn: 86400, // 24 hours
    });
    response.status(200).send({
      email: user["email"],
      accessToken: token,
    });
  } else {
    response.status(404).send({ message: "Email or password invalid" });
  }
});

const userJSON = (user) => {
  return process.env.user.split(",");
};

// Hocuspocus ws route
app.ws(
  "/api/collaboration/:document",
  (websocket, request, websocketContext) => {
    console.log("ws route entered");
    server.handleConnection(websocket, request, websocketContext);
  }
);

// Start the server
app.listen(process.env.WS_PORT, () =>
  console.log(`Listening on http://127.0.0.1:${process.env.WS_PORT}`)
);

// server.listen();

module.exports = server;
