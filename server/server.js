// import dependencies and initialize express
const expressWebsockets = require("express-ws");
const { Server } = require("@hocuspocus/server");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const healthRoutes = require("./routes/health-route");
const swaggerRoutes = require("./routes/swagger-route");

// Configure Hocuspocus
const server = Server.configure({
  async connected() {
    console.log("connections:", server.getConnectionsCount());
  },
});

// Setup your express instance using the express-ws extension
const { app } = expressWebsockets(express());

// Add a websocket route for Hocuspocus
// Note: make sure to include a parameter for the document name.
// You can set any contextual data like in the onConnect hook
// and pass it to the handleConnection method.
app.ws("/collaboration/:document", (websocket, request) => {
  console.log("ws entered?");
  const context = {
    user: {
      id: 1234,
      name: "Jane",
    },
  };

  server.handleConnection(websocket, request, context);
});

app.ws("status", (websocket, request) => {
  const context = {
    user: {
      id: 1234,
      name: "Jane",
    },
  };

  server.handleConnection(websocket, request, context);
});

// enable parsing of http request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// routes and api calls
app.use("/health", healthRoutes);
app.use("/swagger", swaggerRoutes);

// default path to serve up index.html (single page application)
app.all("", (req, res) => {
  res.status(200).sendFile(path.join(__dirname, "../public", "index.html"));
});

// start node server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App UI available http://localhost:${port}`);
  console.log(`Swagger UI available http://localhost:${port}/swagger/api-docs`);
});

// error handler for unmatched routes or api calls
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "../public", "404.html"));
});

module.exports = app;
