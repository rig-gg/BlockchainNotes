const API = "http://localhost:3000/api";

let selectedIndex = null;
let currentChain  = [];

// ── Load chain from backend ───────────────────────────────────────────────────
async function loadChain() {
  const res  = await fetch(`${API}/chain`);
  const data = await res.json();
  currentChain = data.chain;

  renderNoteList(currentChain);
  updateChainPill(data.isValid);

  if (selectedIndex !== null && currentChain[selectedIndex]) {
    renderNoteView(currentChain[selectedIndex]);
  }
}

// ── Sidebar note list ─────────────────────────────────────────────────────────
function renderNoteList(chain) {
  const list = document.getElementById("noteList");
  list.innerHTML = "";

  // Skip genesis block (index 0) — show only real notes
  const notes = chain.filter(b => b.index > 0);

  if (notes.length === 0) {
    list.innerHTML = `<p class="empty-msg">No notes yet. Write one below!</p>`;
    return;
  }

  // Show newest first
  [...notes].reverse().forEach((block) => {
    const item = document.createElement("div");
    item.className = `note-item ${block.status.toLowerCase()}${block.index === selectedIndex ? " selected" : ""}`;
    item.id        = `note-item-${block.index}`;
    item.onclick   = () => selectNote(block.index);

    const titleText = block.note.length > 32
      ? block.note.substring(0, 29) + "..."
      : block.note;

    const tamperDot = block.status === "TAMPERED"
      ? `<span class="tamper-dot"></span>`
      : "";

    item.innerHTML = `
      <div class="note-item-title">${titleText}</div>
      <div class="note-item-meta">
        ${tamperDot}
        <span>${block.timestamp}</span>
      </div>
    `;

    list.appendChild(item);
  });
}

// ── Select and view a note ────────────────────────────────────────────────────
function selectNote(index) {
  selectedIndex = index;

  document.querySelectorAll(".note-item").forEach(el => el.classList.remove("selected"));
  const item = document.getElementById(`note-item-${index}`);
  if (item) item.classList.add("selected");

  const block = currentChain[index];
  if (block) renderNoteView(block);
}

function renderNoteView(block) {
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("noteView").style.display   = "flex";

  const isTampered = block.status === "TAMPERED";

  // Meta
  document.getElementById("noteMeta").innerHTML = `
    <span class="note-index">Note #${block.index}</span><br/>
    ${block.timestamp}
  `;

  // Note body
  document.getElementById("noteBody").textContent = block.note;

  // Action buttons — only show for non-genesis
  document.getElementById("tamperBtn").style.display  = "inline-flex";
  document.getElementById("restoreBtn").style.display = isTampered ? "inline-flex" : "none";

  // Blockchain info grid
  const isHashMismatch = isTampered;
  document.getElementById("chainGrid").innerHTML = `
    <div class="chain-field">
      <label>Block Index</label>
      <value>#${block.index}</value>
    </div>
    <div class="chain-field">
      <label>Status</label>
      <value class="${isTampered ? "tampered-hash" : ""}">${block.status === "Valid" ? "✔ Valid" : block.status === "TAMPERED" ? "✘ Tampered" : "◆ Genesis"}</value>
    </div>
    <div class="chain-field full">
      <label>Timestamp</label>
      <value>${block.timestamp}</value>
    </div>
    <div class="chain-field full">
      <label>Previous Hash</label>
      <value>${block.previousHash}</value>
    </div>
    <div class="chain-field full">
      <label>Hash ${isTampered ? "(⚠ mismatch detected)" : ""}</label>
      <value class="${isTampered ? "tampered-hash" : ""}">${block.hash}</value>
    </div>
  `;
}

// ── Update sidebar chain pill ─────────────────────────────────────────────────
function updateChainPill(isValid) {
  const pill = document.getElementById("chainPill");
  pill.textContent = isValid ? "● Secured" : "● Compromised";
  pill.className   = `chain-pill ${isValid ? "valid" : "tampered"}`;
}

// ── Add a note ────────────────────────────────────────────────────────────────
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

// ── Focus compose area (New Note button) ──────────────────────────────────────
function focusCompose() {
  document.getElementById("noteInput").focus();
}

// ── Tamper modal ──────────────────────────────────────────────────────────────
function openTamperModal() {
  if (selectedIndex === null || selectedIndex === 0) return;
  document.getElementById("modalBlockIndex").textContent = selectedIndex;
  document.getElementById("tamperInput").value           = "[TAMPERED DATA]";
  document.getElementById("modalOverlay").style.display  = "flex";
}

function closeModal() {
  document.getElementById("modalOverlay").style.display = "none";
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

// ── Restore block ─────────────────────────────────────────────────────────────
async function restoreBlock() {
  if (selectedIndex === null || selectedIndex === 0) return;

  await fetch(`${API}/restore`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ index: selectedIndex }),
  });

  await loadChain();
}

// ── Blockchain accordion toggle ───────────────────────────────────────────────
function toggleAccordion() {
  const body  = document.getElementById("accordionBody");
  const arrow = document.getElementById("accordionArrow");
  const open  = body.style.display === "none";
  body.style.display  = open ? "block" : "none";
  arrow.textContent   = open ? "▾" : "▸";
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// ── Enter to save (Shift+Enter for new line) ──────────────────────────────────
document.getElementById("noteInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    addNote();
  }
});

// ── Initial load ──────────────────────────────────────────────────────────────
loadChain();
