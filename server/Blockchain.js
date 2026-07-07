const Block    = require("./Block");
const supabase = require("./supabaseClient");

async function fetchTimestamp() {
  try {
    const res  = await fetch("https://timeapi.io/api/time/current/zone?timeZone=Asia/Manila");
    const data = await res.json();
    // Returns e.g. "2026-06-30 10:08:34.123456"
    const dt   = new Date(data.dateTime);
    return dt.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  } catch (err) {
    // Fallback to local time if the API is unreachable
    console.warn("Time API unavailable, using local time.");
    return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  }
}

class Blockchain {

  // Loads the full chain from Supabase, ordered by index
  async loadChain() {
    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .order("index", { ascending: true });

    if (error) throw error;

    // If empty, create the genesis block
    if (!data || data.length === 0) {
      const genesis = new Block(0, "Genesis Block", "0000000000000000");
      await supabase.from("blocks").insert(genesis.toRow());
      return [genesis];
    }

    return data.map(Block.fromRow);
  }

  async addNote(note) {
    const chain = await this.loadChain();
    const last  = chain[chain.length - 1];
    const block = new Block(chain.length, note, last.hash);

    const { error } = await supabase.from("blocks").insert(block.toRow());
    if (error) throw error;

    return block;
  }

  // Changes note WITHOUT recalculating hash — makes it detectable
  async tamperBlock(index, newNote) {
    const chain = await this.loadChain();
    if (index <= 0 || index >= chain.length) return false;

    const { error } = await supabase
      .from("blocks")
      .update({ note: newNote })
      .eq("index", index);

    if (error) throw error;
    return true;
  }

  // Fixes the tampered block then cascades down to relink all blocks after it
  async restoreBlock(index) {
    const chain = await this.loadChain();
    if (index <= 0 || index >= chain.length) return false;

    const target      = chain[index];
    target.previousHash = chain[index - 1].hash;
    target.hash         = target.calculateHash();

    await supabase
      .from("blocks")
      .update({ previous_hash: target.previousHash, hash: target.hash })
      .eq("index", index);

    for (let i = index + 1; i < chain.length; i++) {
      const current  = chain[i];
      const previous = chain[i - 1];
      current.previousHash = previous.hash;
      current.hash         = current.calculateHash();

      await supabase
        .from("blocks")
        .update({ previous_hash: current.previousHash, hash: current.hash })
        .eq("index", current.index);
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

  // Returns full chain with status attached to each block
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