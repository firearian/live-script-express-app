const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

let collection;
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
const connectDB = async () => {
  await MDBclient.connect();
  const db = MDBclient.db(process.env.DB_NAME);
  collection = db.collection(process.env.COLLECTION_NAME);
};

const getCollection = () => {
  if (!collection) {
    throw new Error("Database not connected.");
  }
  return collection;
};

const disconnectClient = () => {
  MDBclient.close();
};

const getItem = async (field, value) => {
  return await collection.findOne({ [field]: value }).then((record) => {
    if (!record) {
      return false;
    }
    return record;
  });
};

// const updateCollection = async (value) => {
//   return await collection.updateOne(value
//     { name: documentName },
//     { $set: { name: documentName, data: state } },
//     { upsert: true }
//   );
// };

module.exports = { connectDB, getCollection, getItem, disconnectClient };
