class Status {
    constructor() {
      this.C = 0; // Carry Bit
      this.Z = 0; // Zero
      this.I = 0; // Disable Interrupts
      this.D = 0; // Decimal mode
      this.B = 0; // Break
      this.U = 1; // Unused
      this.V = 0; // Overflow
      this.N = 0; // Negative


      this.bitFlags = {
        C: (1 << 0),
        Z: (1 << 1),
        I: (1 << 2),
        D: (1 << 3),
        B: (1 << 4),
        U: (1 << 5),
        V: (1 << 6),
        N: (1 << 7),
      }
    }
    setFlag(flag, value) {
      if (value) {
        this[flag] = 1;
      } else {
        this[flag] = 0;
      }
    }
  
    getFlag(flag) {
      return this[flag];
    }
    
    get flags() {
      const flags =
        "0b" +
        this.N +
        this.V +
        this.U +
        this.B +
        this.D +
        this.I +
        this.Z +
        this.C;
      return Number(flags);
    }

    set flags(value) {
      this.C = value & 0b0000_0001;
      this.Z = (value & 0b0000_0010) >> 1;
      this.I = (value & 0b0000_0100) >> 2;
      this.D = (value & 0b0000_1000) >> 3;
      this.B = (value & 0b0001_0000) >> 4;
      this.U = (value & 0b0010_0000) >> 5;
      this.V = (value & 0b0100_0000) >> 6;
      this.N = (value & 0b1000_0000) >> 7;
    }
  
    resetFlags() {
      this.setFlag("N", 0);
      this.setFlag("V", 0);
      this.setFlag("U", 1);
      this.setFlag("B", 0);
      this.setFlag("D", 0);
      this.setFlag("I", 0);
      this.setFlag("Z", 0);
      this.setFlag("C", 0);
    }
  }

  module.exports = { Status }