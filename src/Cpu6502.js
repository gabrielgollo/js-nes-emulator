class CPU {
  constructor() {
    // Registers
    this.accumulator = 0x0;
    this.index_X = 0x0;
    this.index_Y = 0x0;
    this.stck_pointer = 0x0; // stack pointer
    this.p_counter = 0x0; // Program counter
    this.status = 0b000_00000; // NV1BDIZC

    this.instructions = {
      0: () => {
        // BRK -- Force Break - 1 byte - 7 cycles
        return;
      },
      169: (PGR) => {
        // LDA -- Load Accumulator - 2 bytes - 2 Cycles
        this.p_counter += 1;
        const param = PGR[this.p_counter];
        this.accumulator = param;

        // Change Z flag
        if (this.accumulator == 0) {
          this.status = this.status | 0b0000_0010;
        } else {
          this.status = this.status & 0b1111_1101;
        }

        // Change N flag
        if (this.accumulator & 0b1000_0000) {
          this.status = this.status | 0b1000_0000;
        } else {
          this.status = this.status & 0b0111_1111;
        }
      },
      170: () => {
        // TAX Transfer Accumulator to X - 1 byte - 2 Cycles
        this.p_counter += 1;
        this.index_X = this.accumulator;
      },
    };
  }

  printCpuRegisters() {
    console.log(
      `A:${this.accumulator.toString(16)} X:${this.index_X.toString(
        16
      )} Y:${this.index_Y.toString(16)} S:${this.stck_pointer.toString(
        16
      )} P:${this.status.toString(2)} pc:${this.p_counter.toString(16)}`
    );
  }

  interpret(PGR_ROM) {
    this.printCpuRegisters();
    //console.log(`decimal-> ${numero} hexa-> ${numero.toString(16)}`);
    while (this.p_counter < PGR_ROM.length) {
      let opcode = Number(PGR_ROM[this.p_counter]);

      try {
        console.log(`instruction: ${opcode.toString(16)}`);
        this.instructions[opcode](PGR_ROM);
      } catch (error) {
        console.log("Failed to load opcode");
      }

      this.p_counter += 1;
      this.printCpuRegisters();
    }
  }
}

module.exports = new CPU();
