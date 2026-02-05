import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import path from "path";
import { fileURLToPath } from "url";

import User from "./models/User.js";
import Note from "./models/Note.js";

/* ================= SETUP ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "cloudpad.sid",
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

/* ================= GUARDS ================= */
function isLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("Not logged in");
  }
  next();
}

function isAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).send("Admin only");
  }
}

/* ================= AUTH ================= */
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const exists = await User.findOne({ username });
    if (exists) return res.send("User already exists");

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hash
    });

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = user.isAdmin || false;

    res.redirect("/notepad.html");
  } catch (err) {
    console.error(err);
    res.status(500).send("Register error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.send("Invalid user");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.send("Wrong password");

    // ✅ SESSION SET (SIMPLE & SAFE)
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.isAdmin = user.isAdmin === true;

    console.log("LOGIN SESSION:", req.session);

    if (req.session.isAdmin) {
      res.redirect("/admin.html");
    } else {
      res.redirect("/notepad.html");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});


/* ================= USER INFO ================= */
app.get("/me", (req, res) => {
  res.json({ username: req.session.username || "User" });
});

app.get("/debug-session", (req, res) => {
  res.json(req.session);
});

/* ================= NOTES ================= */
app.get("/notes", isLoggedIn, async (req, res) => {
  const notes = await Note.find({ userId: req.session.userId }).sort({
    updatedAt: -1
  });
  res.json(notes);
});

app.post("/notes/new", isLoggedIn, async (req, res) => {
  const note = await Note.create({
    userId: req.session.userId,
    title: "Untitled",
    content: ""
  });
  res.json(note);
});

app.post("/save", isLoggedIn, async (req, res) => {
  const { noteId, content } = req.body;
  if (!noteId) return res.status(400).send("noteId missing");

  await Note.findByIdAndUpdate(noteId, {
    content,
    updatedAt: new Date()
  });

  res.send("saved");
});

/* ================= ADMIN ROUTES ================= */
app.get("/admin/users", isAdmin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

app.get("/admin/stats", isAdmin, async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers });
});

/* ================= HOME ================= */
app.get("/", (req, res) => {
  res.send("CloudPad backend is LIVE 🚀");
});

/* ================= DATABASE + START ================= */
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  } catch (err) {
    console.error("Mongo connection failed:", err.message);
  }
}

app.get("/hash-admin", async (req, res) => {
  const hash = await bcrypt.hash("admin123", 10);
  await User.updateOne(
    { username: "admin" },
    { $set: { password: hash } }
  );
  res.send("Admin password hashed");
});

startServer();
