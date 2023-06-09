// import dependencies and initialize express
const express = require("express");
const expressWebsockets = require("express-ws");
const { Server } = require("@hocuspocus/server");
const { Redis } = require("@hocuspocus/extension-redis");
const { Database } = require("@hocuspocus/extension-database");
const { Logger } = require("@hocuspocus/extension-logger");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
  connectDB,
  getItem,
  getCollection,
  disconnectClient,
} = require("./database");
const { validateUser } = require("./auth");
const { getRandomColor } = require("./colours");
require("dotenv-safe").config();

// Connect to DB on startup
connectDB()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.error(err));

const server = Server.configure({
  async onAuthenticate(data) {
    const { token } = data;
    const decoded = jwt.verify(
      token.replaceAll('"', ""),
      process.env.SECRET_KEY
    );
    return { name: decoded.name };
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
        if (documentName) {
          try {
            console.log("fetch async");
            const document = documentName
              ? await getItem("name", documentName)
              : null;
            const data = document?.data?.buffer;
            console.log("Mongo DB Data fetched: ", data);
            return document ? data : null;
          } catch (error) {
            console.error("Error fetching data from MongoDB", error);
            return null;
          }
        }
      },

      // … and a Promise to store data:
      store: async (data) => {
        const {
          documentName,
          state,
          context: { name },
        } = data;
        try {
          if (documentName && state.length > 2) {
            const collection = getCollection();
            await collection.updateOne(
              { name: documentName },
              { $set: { name: documentName, data: state } },
              { upsert: true }
            );
            await collection.updateOne(
              { user: name },
              { $addToSet: { documents: documentName } },
              { upsert: true }
            );
            console.log("Mongo DB Data stored: ", documentName);
          }
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
    disconnectClient();
  },
});

// Express instance using the express-ws extension
const { app } = expressWebsockets(express());
var whitelist = [
  "https://main--gregarious-marshmallow-0e8779.netlify.app",
  "https://gregarious-marshmallow-0e8779.netlify.app",
  /netlify\.app$/,
  "http://localhost:3000",
];
console.log(whitelist);
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      // remove the !origin after testing
      callback(null, true);
    } else {
      console.log(origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(express.json());

app.use(cors(corsOptions));

// Basic http route
app.get("/", (request, response) => {
  response.send("What... Are you doing?");
});

// Basic http route
app.post("/api/login", (request, response) => {
  if (!getCollection()) {
    return response
      .status(500)
      .send({ message: "Server Error. Database not connected" });
  }
  console.log("request: ", request.body);
  const { email, password } = request.body;
  return validateUser(email, password).then((user) => {
    console.log("Validated User: ", user);
    if (user) {
      var token = jwt.sign({ name: email }, process.env.SECRET_KEY, {
        expiresIn: 3600, // 24 hours
      });
      // response.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
      response.cookie("token", token, { httpOnly: true });
      console.log("User is valid");
      const username =
        user["user"].charAt(0).toUpperCase() +
        user["user"].replace(/@.*/g, "").slice(1);
      response.status(200).send({
        user: {
          name: username,
          color: getRandomColor(),
          documents: user["documents"],
        },
        accessToken: token,
      });
    } else {
      console.log("fails");
      response.status(400).send({ message: "Email or password invalid" });
    }
  });
});

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
