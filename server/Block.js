const crypto = require("crypto");

class Block {
  constructor(index, note, previousHash, timestamp = null) {
    this.index        = index;
    this.note         = note;
    this.previousHash = previousHash;
    this.timestamp    = timestamp || new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    this.hash         = this.calculateHash();
  }

  calculateHash() {
    const data = `${this.index}${this.timestamp}${this.note}${this.previousHash}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  isValid(expectedPreviousHash) {
    return (
      this.previousHash === expectedPreviousHash &&
      this.hash === this.calculateHash()
    );
  }

  shortHash() {
    return this.hash.substring(0, 12) + "...";
  }

  // Converts a Supabase row (snake_case) into a Block instance
  static fromRow(row) {
    const block = new Block(row.index, row.note, row.previous_hash, row.timestamp);
    block.hash = row.hash; // preserve stored hash (may be intentionally stale if tampered)
    return block;
  }

  // Converts a Block instance into a Supabase row (snake_case)
  toRow() {
    return {
      index:         this.index,
      note:          this.note,
      timestamp:     this.timestamp,
      previous_hash: this.previousHash,
      hash:          this.hash,
    };
  }
}

module.exports = Block;