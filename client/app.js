const API = "http://localhost:3000/api";

let selectedIndex = null;
let currentChain  = [];

// ── Load chain from backend ───────────────────────────────────────────────────
async function loadChain() {
  const res  = await fetch(`${API}/chain`);
  const data = await res.json();
  currentChain = data.chain;

  renderNoteNav(currentChain);
  updateChainBadge(data.isValid);

  if (selectedIndex !== null && currentChain[selectedIndex]) {
    renderNoteView(currentChain[selectedIndex]);
  }
}

// ── Sidebar note list ──────────────────────────────────────────────────────────
function renderNoteNav(chain) {
  const nav = document.getElementById("noteNav");
  nav.innerHTML = "";

  // Skip genesis block (index 0) — show only real notes
  const notes = chain.filter(b => b.index > 0);

  if (notes.length === 0) {
    nav.innerHTML = `<p class="nav-empty">No notes yet — write one below.</p>`;
    return;
  }

  // Newest first
  [...notes].reverse().forEach((block) => {
    const item = document.createElement("div");
    item.className = `nav-item ${block.status.toLowerCase()}${block.index === selectedIndex ? " active" : ""}`;
    item.id        = `nav-item-${block.index}`;
    item.onclick   = () => selectNote(block.index);

    const titleText = block.note.length > 28
      ? block.note.substring(0, 25) + "..."
      : block.note;

    item.innerHTML = `
      <span class="nav-item-title">${titleText}</span>
      <span class="nav-item-time">${block.timestamp}</span>
    `;

    nav.appendChild(item);
  });
}

// ── Select and render a note ───────────────────────────────────────────────────
function selectNote(index) {
  selectedIndex = index;

  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const item = document.getElementById(`nav-item-${index}`);
  if (item) item.classList.add("active");

  const block = currentChain[index];
  if (block) renderNoteView(block);
}

function renderNoteView(block) {
  document.getElementById("splash").style.display   = "none";
  document.getElementById("noteView").style.display = "flex";

  const isTampered = block.status === "TAMPERED";

  // Timestamp + status pill
  document.getElementById("noteTimestamp").textContent = block.timestamp;

  const pill = document.getElementById("noteStatusPill");
  pill.textContent = isTampered ? "Tampered" : "Valid";
  pill.className   = `status-pill ${isTampered ? "tampered" : "valid"}`;

  // Note content
  document.getElementById("noteContent").textContent = block.note;

  // Action buttons
  const actions = document.getElementById("noteActions");
  actions.innerHTML = isTampered
    ? `<button class="action-btn success" onclick="restoreBlock()">Restore</button>`
    : `<button class="action-btn danger" onclick="openTamperModal()">Tamper</button>`;

  // Metadata drawer
  document.getElementById("metaGrid").innerHTML = `
    <div class="meta-field">
      <span class="meta-label">Block</span>
      <span class="meta-value">#${block.index}</span>
    </div>
    <div class="meta-field">
      <span class="meta-label">Status</span>
      <span class="meta-value ${isTampered ? "flagged" : ""}">${isTampered ? "Tampered" : "Valid"}</span>
    </div>
    <div class="meta-field wide">
      <span class="meta-label">Previous hash</span>
      <span class="meta-value">${block.previousHash}</span>
    </div>
    <div class="meta-field wide">
      <span class="meta-label">Hash${isTampered ? " — mismatch detected" : ""}</span>
      <span class="meta-value ${isTampered ? "flagged" : ""}">${block.hash}</span>
    </div>
  `;
}

// ── Header chain badge ──────────────────────────────────────────────────────────
function updateChainBadge(isValid) {
  const badge = document.getElementById("chainBadge");
  badge.textContent = isValid ? "Secured" : "Compromised";
  badge.className   = `chain-badge ${isValid ? "secured" : "compromised"}`;
}

// ── Add a note ───────────────────────────────────────────────────────────────────
async function addNote() {
  const input = document.getElementById("noteInput");
  const note  = input.value.trim();
  if (!note) return;

  const res = await fetch(`${API}/add`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ note }),
  });

  if (res.ok) {
    const data    = await res.json();
    selectedIndex = data.block.index;
    input.value   = "";
    input.style.height = "auto";
    await loadChain();
  }
}

// Generate random note from backend proxy @ RandomWordAPI
async function generateNote() {
  const btn   = document.getElementById("generateBtn");
  const input = document.getElementById("noteInput");

  btn.textContent = "Generating...";
  btn.disabled    = true;

  try {
    const res   = await fetch(`${API}/randomword`);
    const data = await res.json();
    input.value = data.words.join(" ");
    autoResize(input);
    input.focus();
  } catch (err) {
    input.value = "Could not fetch random words. Try again.";
  } finally {
    btn.textContent = "Generate";
    btn.disabled    = false;
  }
}

function focusCompose() {
  const input = document.getElementById("noteInput");
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.focus();
}

// ── Tamper modal ───────────────────────────────────────────────────────────────────
function openTamperModal() {
  if (selectedIndex === null || selectedIndex === 0) return;
  document.getElementById("modalIdx").textContent     = selectedIndex;
  document.getElementById("tamperInput").value         = "[TAMPERED DATA]";
  document.getElementById("overlay").style.display     = "flex";
}

function closeModal() {
  document.getElementById("overlay").style.display = "none";
}

async function confirmTamper() {
  const newNote = document.getElementById("tamperInput").value.trim();
  if (!newNote) return;

  await fetch(`${API}/tamper`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ index: selectedIndex, newNote }),
  });

  closeModal();
  await loadChain();
}

// ── Restore block ─────────────────────────────────────────────────────────────────
async function restoreBlock() {
  if (selectedIndex === null || selectedIndex === 0) return;

  await fetch(`${API}/restore`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ index: selectedIndex }),
  });

  await loadChain();
}

// ── Metadata drawer toggle ───────────────────────────────────────────────────────
function toggleDrawer() {
  const body  = document.getElementById("drawerBody");
  const caret = document.getElementById("drawerCaret");
  const open  = body.style.display === "none" || body.style.display === "";
  body.style.display = open ? "block" : "none";
  caret.classList.toggle("open", open);
}

// ── Auto-resize textarea ─────────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// ── Enter to save (Shift+Enter for new line) ─────────────────────────────────────
document.getElementById("noteInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    addNote();
  }
});

// ── Initial state ─────────────────────────────────────────────────────────────────
document.getElementById("drawerBody").style.display = "none";
loadChain();