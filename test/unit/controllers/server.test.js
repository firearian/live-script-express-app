const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai = require("chai");
const { expect } = require("chai");
const { Hocuspocus } = require("@hocuspocus/server");
const { Redis } = require("@hocuspocus/extension-redis");
const { Database } = require("@hocuspocus/extension-database");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Logger } = require("@hocuspocus/extension-logger");

chai.use(sinonChai);

describe("Server", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should initialize server with the correct extensions", () => {
    const redisExtension = new Redis({});
    const databaseExtension = new Database({});
    const loggerExtension = new Logger({});

    const extensions = [redisExtension, databaseExtension, loggerExtension];

    const server = new Hocuspocus({
      port: 3000,
      extensions,
    });

    expect(server.configuration.extensions).to.deep.equal(extensions);
  });

  it("should connect to MongoDB and set the collection", async () => {
    const collectionStub = sandbox.stub().returns({});

    const dbStub = {
      collection: collectionStub,
    };

    const clientStub = {
      db: sandbox.stub().returns(dbStub),
    };

    const connectStub = sandbox
      .stub(MongoClient.prototype, "connect")
      .resolves(clientStub);

    const server = new Hocuspocus({ port: 3000 });

    // Manually trigger the connection event
    await server.createConnection();

    expect(connectStub).to.have.been.calledOnce;
    expect(collectionStub).to.have.been.calledOnce;
    expect(server.collection).to.exist;
  });

  it("should handle Redis onChange event", async () => {
    const server = new Hocuspocus({ port: 3000 });
    const redisExtension = new Redis({});
    server.use(redisExtension);

    const onChangeSpy = sandbox.spy(console, "log");

    await redisExtension.onChange({ documentName: "test" });

    expect(onChangeSpy).to.have.been.calledWith("Redis Fetch called");
  });

  it("should fetch data from MongoDB", async () => {
    const server = new Hocuspocus({ port: 3000 });
    const collection = {
      findOne: sandbox
        .stub()
        .resolves({ name: "document", data: { buffer: "data" } }),
    };
    server.collection = collection;

    const databaseExtension = new Database({});
    server.use(databaseExtension);

    const fetchResult = await databaseExtension.fetch({ documentName: "test" });

    expect(collection.findOne).to.have.been.calledOnceWith({ name: "test" });
    expect(fetchResult).to.equal("data");
  });

  it("should store data in MongoDB", async () => {
    const server = new Hocuspocus({ port: 3000 });
    const collection = {
      updateOne: sandbox.stub().resolves(),
    };
    server.collection = collection;

    const databaseExtension = new Database({});
    server.use(databaseExtension);

    await databaseExtension.store({ documentName: "test", state: "data" });

    expect(collection.updateOne).to.have.been.calledOnceWith(
      { name: "test" },
      { $set: { name: "test", data: "data" } },
      { upsert: true }
    );
  });

  it("should call connected() with the correct connections count", async () => {
    const server = new Hocuspocus({ port: 3000 });

    const connectionsCount = 5;
    server.getConnectionsCount = sandbox.stub().returns(connectionsCount);

    const connectedSpy = sandbox.spy(server, "connected");

    await server.onConnect();

    expect(connectedSpy).to.have.been.calledOnce;
    expect(connectedSpy).to.have.been.calledWithExactly(connectionsCount);
  });

  it("should call onDisconnect() with the correct connections count", async () => {
    const server = new Hocuspocus({ port: 3000 });

    const connectionsCount = 3;
    server.getConnectionsCount = sandbox.stub().returns(connectionsCount);

    const onDisconnectSpy = sandbox.spy(server, "onDisconnect");

    await server.onDisconnect();

    expect(onDisconnectSpy).to.have.been.calledOnce;
    expect(onDisconnectSpy).to.have.been.calledWithExactly(connectionsCount);
  });

  it("should close the MongoDB client on destroy", async () => {
    const server = new Hocuspocus({ port: 3000 });
    const closeStub = sandbox.stub(MongoClient.prototype, "close");

    await server.onDestroy();

    expect(closeStub).to.have.been.calledOnce;
  });
});
