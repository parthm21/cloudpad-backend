const mongoose = require("mongoose");

module.exports = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
  })
);
