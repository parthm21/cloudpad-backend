import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    title: String,
    content: String
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);

export default Note;
