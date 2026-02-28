console.log("SCRIPT LOADED");

// ===============================
// ELEMENTS
// ===============================
const note = document.getElementById("note");
const status = document.getElementById("saveStatus");
const clockEl = document.getElementById("clock");
const appTitle = document.getElementById("appTitle");
const logoutBtn = document.getElementById("logoutBtn");

const notesBtn = document.getElementById("notesBtn");
const notesDropdown = document.getElementById("notesDropdown");
const notesList = document.getElementById("notesList");
const createNoteBtn = document.getElementById("createNoteBtn");
const newNoteName = document.getElementById("newNoteName");

let currentId = null;
let autoSaveTimer = null;
let allNotes = [];

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
  status.textContent = "●";
  status.className = "status unsaved";
}

function markSaved() {
  status.textContent = "✔";
  status.className = "status saved";
}

// ===============================
// LOAD NOTES
// ===============================
function loadNotes(selectId = null) {
  fetch("/notes")
    .then(r => r.json())
    .then(data => {
      allNotes = data || [];

      if (allNotes.length === 0) {
        createNewNote("Untitled");
        return;
      }

      let noteToOpen;

      if (selectId) {
        noteToOpen = allNotes.find(n => n._id === selectId);
      }

      if (!noteToOpen) {
        noteToOpen = allNotes[0];
      }

      currentId = noteToOpen._id;
      note.value = noteToOpen.content || "";
      markSaved();

      renderNotes();
    });
}
// Load on page start
loadNotes();

// ===============================
// AUTO SAVE
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
    }).then(() => {
  const currentNote = allNotes.find(n => n._id === currentId);
  if (currentNote) {
    currentNote.content = note.value;  // 🔥 local update
  }
  markSaved();
});
  }, 800);
});

// ===============================
// CREATE NEW NOTE
// ===============================
function createNewNote(title = "Untitled") {
  fetch("/notes/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  })
  .then(r => r.json())
  .then(newNote => {

    currentId = newNote._id;
    note.value = "";
    markSaved();

    // 🔥 Important: open the NEW note, not first one
   allNotes.unshift(newNote);
renderNotes();

currentId = newNote._id;
note.value = "";
  });
}

// ===============================
// RENDER DROPDOWN
// ===============================
function renderNotes() {
  notesList.innerHTML = "";

  allNotes.forEach(noteObj => {

    const displayName =
      noteObj.title && noteObj.title !== "Untitled"
        ? noteObj.title
        : (noteObj.content && noteObj.content.trim() !== ""
            ? noteObj.content.split("\n")[0].substring(0, 20)
            : "Untitled");

    const div = document.createElement("div");
    div.className = "note-item";

    const titleSpan = document.createElement("span");
    titleSpan.className = "note-title";
    titleSpan.textContent = displayName;

    const deleteSpan = document.createElement("span");
    deleteSpan.className = "delete-btn";
    deleteSpan.innerHTML = `
      <div class="trash-wrap">
        <svg class="trash-icon" viewBox="0 0 24 24">
          <path d="M9 3h6l1 2h5v2H3V5h5l1-2zM6 9h12l-1 11H7L6 9z"/>
        </svg>
      </div>
    `;

    // OPEN
   titleSpan.addEventListener("click", () => {

  const selected = allNotes.find(n => n._id === noteObj._id);
  if (!selected) return;

  currentId = selected._id;
  note.value = selected.content || "";

  markSaved();
  notesDropdown.classList.remove("show");
});
    // RENAME
    titleSpan.addEventListener("dblclick", () => {

      const input = document.createElement("input");
      input.type = "text";
      input.value = noteObj.title || "";
      input.className = "rename-input";

      div.replaceChild(input, titleSpan);
      input.focus();
      input.select();

      const saveRename = async () => {
        const newTitle = input.value.trim() || "Untitled";

        await fetch("/notes/" + noteObj._id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle })
        });

        noteObj.title = newTitle;
        renderNotes();
      };

      input.addEventListener("blur", saveRename);

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") renderNotes();
      });
    });

    // DELETE
    deleteSpan.addEventListener("click", async (e) => {
      e.stopPropagation();

      await fetch("/notes/" + noteObj._id, {
        method: "DELETE"
      });

      allNotes = allNotes.filter(n => n._id !== noteObj._id);

      if (currentId === noteObj._id) {
        if (allNotes.length > 0) {
          currentId = allNotes[0]._id;
          note.value = allNotes[0].content || "";
        } else {
          note.value = "";
        }
      }

      renderNotes();
    });

    div.appendChild(titleSpan);
    div.appendChild(deleteSpan);
    notesList.appendChild(div);
  });
}

// ===============================
// DROPDOWN TOGGLE
// ===============================
notesBtn.addEventListener("click", () => {
  notesDropdown.classList.toggle("show");
  renderNotes(); // ❌ no server call
});

// ===============================
// ADD NOTE FROM DROPDOWN
// ===============================
createNoteBtn.addEventListener("click", () => {
  const name = newNoteName.value.trim();
  if (!name) return;

  createNewNote(name);
  newNoteName.value = "";
});

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
    clockEl.textContent = new Date().toLocaleString();
  }
  updateClock();
  setInterval(updateClock, 1000);
}
