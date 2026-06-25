const Block = require("./Block");

class Blockchain {
  constructor() {
    this.chain = [new Block(0, "Genesis Block", "0000000000000000")];
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addNote(note) {
    const last  = this.getLastBlock();
    const block = new Block(this.chain.length, note, last.hash);
    this.chain.push(block);
    return block;
  }

  // Changes note WITHOUT recalculating hash — makes it detectable
  tamperBlock(index, newNote) {
    if (index <= 0 || index >= this.chain.length) return false;
    this.chain[index].note = newNote;
    return true;
  }

  // Fixes the tampered block then cascades down to relink all blocks after it
  restoreBlock(index) {
    if (index <= 0 || index >= this.chain.length) return false;

    const target      = this.chain[index];
    target.previousHash = this.chain[index - 1].hash;
    target.hash         = target.calculateHash();

    for (let i = index + 1; i < this.chain.length; i++) {
      const current  = this.chain[i];
      const previous = this.chain[i - 1];
      current.previousHash = previous.hash;
      current.hash         = current.calculateHash();
    }

    return true;
  }

  getStatus(index) {
    if (index === 0) return "Genesis";
    const b    = this.chain[index];
    const prev = this.chain[index - 1];
    return b.isValid(prev.hash) ? "Valid" : "TAMPERED";
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      if (!this.chain[i].isValid(this.chain[i - 1].hash)) return false;
    }
    return true;
  }

  // Returns full chain with status attached to each block
  getChainWithStatus() {
    return this.chain.map((block, i) => ({
      ...block,
      status:    this.getStatus(i),
      shortHash: block.shortHash(),
    }));
  }
}

module.exports = Blockchain;
