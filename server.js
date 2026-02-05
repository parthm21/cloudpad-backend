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

// Static files (CSS, JS, images)
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

/* ================= BLOCK DIRECT HTML ACCESS ================= */
app.use((req, res, next) => {
  if (req.path.endsWith(".html") && !req.session.userId) {
    return res.redirect("/login.html");
  }
  next();
});

/* ================= GUARDS ================= */
function isLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login.html");
  }
  next();
}

function isAdmin(req, res, next) {
  if (req.session.isAdmin === true) {
    return next();
  }
  return res.status(403).send("Admin only");
}

/* ================= AUTH ================= */
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hash
    });

    // ✅ VERY IMPORTANT (SESSION SET)
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.isAdmin = user.isAdmin === true;

    // ✅ success
    return res.json({
      success: true
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Register error"
    });
  }
});


app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid user" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Wrong password" });
    }

    // ✅ SESSION SET (THIS WAS MISSING / WRONG)
    req.session.userId = user._id.toString();
    req.session.username = user.username;   // 🔥 THIS LINE
    req.session.isAdmin = user.isAdmin === true;

    return res.json({
      success: true,
      isAdmin: req.session.isAdmin
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login error" });
  }
});


/* ================= LOGOUT ================= */
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("cloudpad.sid");
    res.redirect("/login.html");
  });
});

/* ================= PROTECTED PAGES ================= */

// User notepad
app.get("/notepad", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/notepad.html"));
});

// Admin dashboard
app.get("/admin", isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* ================= USER INFO ================= */
app.get("/me", isLoggedIn, (req, res) => {
  res.json({ username: req.session.username });
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

/* ================= ADMIN APIs ================= */
app.get("/admin/users", isAdmin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

app.get("/admin/stats", isAdmin, async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers });
});

/* ================= DEBUG (OPTIONAL – REMOVE IN PROD) ================= */
app.get("/debug-session", (req, res) => {
  res.json(req.session);
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

startServer();
