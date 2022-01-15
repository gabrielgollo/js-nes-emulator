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

class CPU {
  constructor() {
    // Registers
    this.memory = new Array(0xffff); // 16 bits memory
    this.accumulator = 0x0;
    this.index_X = 0x0;
    this.index_Y = 0x0;
    this.stck_pointer = 0x0; // stack pointer
    this.p_counter = 0x0; // Program counter
    this.status = new Status();
    this.interrupt = false; // flag to interrupt loop

    this.instructions = {
      0: () => {
        // BRK -- Force Break - 1 byte - 7 cycles
        this.p_counter += 1;
        this.status.setFlag("I", 1);
        this.status.setFlag("B", 1);
        this.stck_pointer = this.p_counter;
        this.p_counter = this.read(0xfffe);
        this.p_counter += this.read(0xffff) << 8;
        this.setInterrupt();
      },
      169: (PGR) => {
        // LDA -- Load Accumulator - 2 bytes - 2 Cycles
        this.p_counter += 1;
        const param = PGR[this.p_counter];
        this.accumulator = param;

        this.status.setFlag("Z", this.accumulator === 0x0);
        this.status.setFlag("N", this.accumulator & 0x80);
      },
      170: () => {
        // TAX Transfer Accumulator to X - 1 byte - 2 Cycles
        this.p_counter += 1;
        this.index_X = this.accumulator;
        this.status.setFlag("Z", this.index_X === 0x0);
        this.status.setFlag("N", (this.index_X & 0x80) !== 0);
      },
      232: () => {
        // INX Increment X Index - 1 byte - 2 Cycles
        this.index_X += 1;
        this.status.setFlag("Z", this.index_X === 0x0);
        this.status.setFlag("N", (this.index_X & 0x80) !== 0);
      },
    };
  }

  read(address) {
    return this.memory[address];
  }

  write(address, value) {
    this.memory[address] = value;
  }

  printCpuRegisters() {
    console.log(
      `A:${this.accumulator.toString(16)} X:${this.index_X.toString(
        16
      )} Y:${this.index_Y.toString(16)} S:${this.stck_pointer.toString(
        16
      )} P:${this.status.flags.toString(2)} pc:${this.p_counter.toString(16)}`
    );
  }

  setInterrupt() {
    this.interrupt = true;
  }

  reset() {
    this.accumulator = 0x0;
    this.index_X = 0x0;
    this.index_Y = 0x0;
    this.stck_pointer = 0x0; // stack pointer
    this.p_counter = 0x0; // Program counter
    this.status.resetFlags(); // NV1BDIZC
  }

  interpret(PGR_ROM) {
    this.printCpuRegisters();
    //console.log(`decimal-> ${numero} hexa-> ${numero.toString(16)}`);
    while (this.p_counter < PGR_ROM.length) {
      try {
        let opcode = Number(PGR_ROM[this.p_counter]);
        console.log(`instruction: ${opcode.toString(16)}`);
        this.instructions[opcode](PGR_ROM);
      } catch (error) {
        console.log("Failed to load opcode");
      }
      if (this.interrupt) break;
      this.p_counter += 1;
      this.printCpuRegisters();
    }
  }
}

module.exports = new CPU();
