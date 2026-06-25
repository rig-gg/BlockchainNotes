const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const Blockchain = require("./Blockchain");

const app        = express();
const blockchain = new Blockchain();
const PORT       = 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend files from the client folder
app.use(express.static(path.join(__dirname, "../client")));

// ── GET /api/chain ────────────────────────────────────────────────────────────
// Returns the full blockchain with status on each block
app.get("/api/chain", (req, res) => {
  res.json({
    chain:   blockchain.getChainWithStatus(),
    isValid: blockchain.isChainValid(),
  });
});

// ── POST /api/add ─────────────────────────────────────────────────────────────
// Adds a new note as a block
app.post("/api/add", (req, res) => {
  const { note } = req.body;
  if (!note || note.trim() === "") {
    return res.status(400).json({ error: "Note cannot be empty." });
  }
  const block = blockchain.addNote(note.trim());
  res.json({ success: true, block });
});

// ── POST /api/tamper ──────────────────────────────────────────────────────────
// Tampers a block by index with new note content
app.post("/api/tamper", (req, res) => {
  const { index, newNote } = req.body;
  if (index === undefined || !newNote) {
    return res.status(400).json({ error: "index and newNote are required." });
  }
  const success = blockchain.tamperBlock(Number(index), newNote);
  if (!success) return res.status(400).json({ error: "Cannot tamper genesis block or invalid index." });
  res.json({ success: true });
});

// ── POST /api/restore ─────────────────────────────────────────────────────────
// Restores a block and cascades relink to all blocks after it
app.post("/api/restore", (req, res) => {
  const { index } = req.body;
  if (index === undefined) {
    return res.status(400).json({ error: "index is required." });
  }
  const success = blockchain.restoreBlock(Number(index));
  if (!success) return res.status(400).json({ error: "Cannot restore genesis block or invalid index." });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n  Blockchain Notes running at http://localhost:${PORT}\n`);
});
