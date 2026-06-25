const crypto = require("crypto");

class Block {
  constructor(index, note, previousHash) {
    this.index        = index;
    this.note         = note;
    this.previousHash = previousHash;
    this.timestamp    = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
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
}

module.exports = Block;
