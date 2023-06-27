const { getCollection, getItem } = require("./database");

const validateUser = async (email, pass) => {
  if (!email || !pass) {
    return false;
  }
  console.log("validate entered: ", email, pass);

  try {
    console.log("Before");
    getCollection();
    console.log("After");
    return await getItem("user", email).then((record) => {
      if (record.password === pass) {
        return record;
      }
    });
  } catch (error) {
    console.error("Error validating user: ", error);
    throw error;
  }
};

module.exports = { validateUser };
