console.log("SCRIPT LOADED");

// ===============================
// ELEMENTS
// ===============================
const note = document.getElementById("note");
const status = document.getElementById("saveStatus");
const clockEl = document.getElementById("clock");
const appTitle = document.getElementById("appTitle");
const logoutBtn = document.getElementById("logoutBtn");
const newNoteBtn = document.getElementById("newNoteBtn");

let currentId = null;
let autoSaveTimer = null;

// ===============================
// USERNAME
// ===============================
fetch("/me")
  .then(r => r.json())
  .then(d => {
    if (appTitle) appTitle.textContent = d.username || "User";
  });

// ===============================
// SAVE STATUS
// ===============================
function markUnsaved() {
  status.textContent = "● Unsaved";
  status.className = "status unsaved";
}

function markSaved() {
  status.textContent = "✔ Saved";
  status.className = "status saved";
}

// ===============================
// LOAD LAST NOTE ON PAGE LOAD
// ===============================
fetch("/notes")
  .then(r => r.json())
  .then(notes => {
    if (notes.length > 0) {
      // Load most recent note
      currentId = notes[0]._id;
      note.value = notes[0].content || "";
      markSaved();
    } else {
      // No notes exist → create first one
      createNewNote();
    }
  });

// ===============================
// AUTO SAVE (REAL SAVE)
// ===============================
note.addEventListener("input", () => {
  if (!currentId) return;

  markUnsaved();

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: currentId,
        content: note.value
      })
    }).then(markSaved);
  }, 1000);
});

// ===============================
// CREATE NEW NOTE (File → New)
// ===============================
function createNewNote() {
  fetch("/notes/new", { method: "POST" })
    .then(r => r.json())
    .then(noteObj => {
      currentId = noteObj._id;
      note.value = "";
      markSaved();
    });
}

if (newNoteBtn) {
  newNoteBtn.addEventListener("click", createNewNote);
}

// ===============================
// LOGOUT
// ===============================
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "/logout";
  });
}

// ===============================
// CLOCK
// ===============================
if (clockEl) {
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleString();
  }

  updateClock();
  setInterval(updateClock, 1000);
}
