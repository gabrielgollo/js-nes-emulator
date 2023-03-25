class INSTRUCTION {
    constructor(name="", opcode=()=>{}, addressingMode=()=>{}, cycles=0) {
      this.name = name;
      this.opcode = opcode;
      this.addressMode = addressingMode;
      this.cycles = cycles;
    }
  }

  module.exports = { INSTRUCTION }