const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Note",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      title: String,
      content: String
    },
    { timestamps: true }
  )
);
