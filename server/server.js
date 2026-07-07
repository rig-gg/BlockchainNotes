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
app.get("/api/chain", async (req, res) => {
  try {
    const chain   = await blockchain.getChainWithStatus();
    const isValid = await blockchain.checkIsValid();
    res.json({ chain, isValid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load chain." });
  }
});

// ── POST /api/add ─────────────────────────────────────────────────────────────
app.post("/api/add", async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || note.trim() === "") {
      return res.status(400).json({ error: "Note cannot be empty." });
    }
    const block = await blockchain.addNote(note.trim());
    res.json({ success: true, block });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add note." });
  }
});

// ── POST /api/tamper ──────────────────────────────────────────────────────────
app.post("/api/tamper", async (req, res) => {
  try {
    const { index, newNote } = req.body;
    if (index === undefined || !newNote) {
      return res.status(400).json({ error: "index and newNote are required." });
    }
    const success = await blockchain.tamperBlock(Number(index), newNote);
    if (!success) return res.status(400).json({ error: "Cannot tamper genesis block or invalid index." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to tamper block." });
  }
});

// ── GET /api/randomword ───────────────────────────────────────────────────────
// Proxies the random word API so the browser doesn't call it directly
app.get("/api/randomword", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    const response   = await fetch("https://random-word-api.herokuapp.com/word?number=3&diff=1", {
      signal: controller.signal
    });
    clearTimeout(timeout);
    const words = await response.json();
    console.log("Random words fetched:", words);
    res.json({ words, source: "api" });
  } catch (err) {
    console.error("Random word API error:", err.message);
    res.status(503).json({ error: err.message });
  }
});
app.post("/api/restore", async (req, res) => {
  try {
    const { index } = req.body;
    if (index === undefined) {
      return res.status(400).json({ error: "index is required." });
    }
    const success = await blockchain.restoreBlock(Number(index));
    if (!success) return res.status(400).json({ error: "Cannot restore genesis block or invalid index." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to restore block." });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Blockchain Notes running at http://localhost:${PORT}\n`);
});