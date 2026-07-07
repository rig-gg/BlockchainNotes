const Block    = require("./Block");
const supabase = require("./supabaseClient");

// ── Fetch verified timestamp from external Time API ───────────────────────────
async function fetchTimestamp() {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);
    const res        = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Manila", {
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    // Response: { dateTime: "2026-06-30T10:12:38.123", date: "06/30/2026", time: "10:12", ... }
    if (!data || !data.dateTime) throw new Error("No dateTime in response");
    const dt = new Date(data.dateTime);
    if (isNaN(dt.getTime())) throw new Error("Invalid date from API");
    return dt.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  } catch (err) {
    console.warn("TimeAPI unavailable, using local time:", err.message);
    return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  }
}

// ── In-memory fallback chain ───────────────────────────────────────────────────
let memoryChain = null;

async function getMemoryChain() {
  if (!memoryChain) {
    const timestamp = await fetchTimestamp();
    memoryChain = [new Block(0, "Genesis Block", "0000000000000000", timestamp)];
  }
  return memoryChain;
}

// ── Check if Supabase is reachable ─────────────────────────────────────────────
let supabaseAvailable = null; // null = not tested yet

async function checkSupabase() {
  if (supabaseAvailable !== null) return supabaseAvailable;
  try {
    const { error } = await supabase.from("blocks").select("index").limit(1);
    supabaseAvailable = !error;
  } catch {
    supabaseAvailable = false;
  }
  if (!supabaseAvailable) {
    console.warn("⚠  Supabase unreachable — running in memory mode.");
  } else {
    console.log("✔  Supabase connected.");
  }
  return supabaseAvailable;
}

class Blockchain {

  async loadChain() {
    if (!(await checkSupabase())) return getMemoryChain();

    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .order("index", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      const timestamp = await fetchTimestamp();
      const genesis   = new Block(0, "Genesis Block", "0000000000000000", timestamp);
      await supabase.from("blocks").insert(genesis.toRow());
      return [genesis];
    }

    return data.map(Block.fromRow);
  }

  async addNote(note) {
    const chain     = await this.loadChain();
    const last      = chain[chain.length - 1];
    const timestamp = await fetchTimestamp();
    const block     = new Block(chain.length, note, last.hash, timestamp);

    if (await checkSupabase()) {
      const { error } = await supabase.from("blocks").insert(block.toRow());
      if (error) throw error;
    } else {
      (await getMemoryChain()).push(block);
    }

    return block;
  }

  async tamperBlock(index, newNote) {
    const chain = await this.loadChain();
    if (index <= 0 || index >= chain.length) return false;

    if (await checkSupabase()) {
      const { error } = await supabase
        .from("blocks")
        .update({ note: newNote })
        .eq("index", index);
      if (error) throw error;
    } else {
      (await getMemoryChain())[index].note = newNote;
    }

    return true;
  }

  async restoreBlock(index) {
    const chain = await this.loadChain();
    if (index <= 0 || index >= chain.length) return false;

    const target        = chain[index];
    target.previousHash = chain[index - 1].hash;
    target.hash         = target.calculateHash();

    if (await checkSupabase()) {
      await supabase
        .from("blocks")
        .update({ previous_hash: target.previousHash, hash: target.hash })
        .eq("index", index);

      for (let i = index + 1; i < chain.length; i++) {
        const current        = chain[i];
        const previous       = chain[i - 1];
        current.previousHash = previous.hash;
        current.hash         = current.calculateHash();
        await supabase
          .from("blocks")
          .update({ previous_hash: current.previousHash, hash: current.hash })
          .eq("index", current.index);
      }
    } else {
      const mem = await getMemoryChain();
      mem[index] = target;
      for (let i = index + 1; i < chain.length; i++) {
        chain[i].previousHash = chain[i - 1].hash;
        chain[i].hash         = chain[i].calculateHash();
        mem[i] = chain[i];
      }
    }

    return true;
  }

  getStatus(chain, index) {
    if (index === 0) return "Genesis";
    const b    = chain[index];
    const prev = chain[index - 1];
    return b.isValid(prev.hash) ? "Valid" : "TAMPERED";
  }

  isChainValid(chain) {
    for (let i = 1; i < chain.length; i++) {
      if (!chain[i].isValid(chain[i - 1].hash)) return false;
    }
    return true;
  }

  async getChainWithStatus() {
    const chain = await this.loadChain();
    return chain.map((block, i) => ({
      ...block,
      status:    this.getStatus(chain, i),
      shortHash: block.shortHash(),
    }));
  }

  async checkIsValid() {
    const chain = await this.loadChain();
    return this.isChainValid(chain);
  }
}

module.exports = Blockchain;