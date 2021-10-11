class CPU {
  constructor() {
    this.accumulator = 0x0;
    this.index_X = 0x0;
    this.index_Y = 0x0;
    this.stck_pointer = 0x0;
    this.program_counter = 0x0;
    this.status = 0x0;

    this.instructions = {
      169: (PGR, index) => {
        // LDA -- Load Accumulator - 2 bytes - 2 Cycles
        let param = PGR[index + 1];
        this.program_counter += 1;
        this.accumulator = param;
      },
      170: (PGR, index) => {
        // TAX Transfer Accumulator to X - 1 byte - 2 Cycles
        this.program_counter += 1;
        this.index_X = this.program_counter;
      },
    };
  }

  printCpuRegisters() {
    console.log(
      `A:${this.accumulator} X:${this.index_X} Y:${this.index_Y} S:${this.stck_pointer} P:${this.status} pc:${this.program_counter}`
    );
  }

  interpret(PGR_ROM) {
    let opcode = Number(PGR_ROM[0]);
    this.printCpuRegisters();
    //console.log(`decimal-> ${numero} hexa-> ${numero.toString(16)}`);
    try {
      console.log(`instruction: ${opcode}`);
      this.instructions[opcode](PGR_ROM, 0);
    } catch (error) {
      console.log("Failed to load opcode");
    }
    this.printCpuRegisters();
  }
}

const RICOH2A03 = new CPU();
const PGR = new Uint8Array([169, 0xc0]);
RICOH2A03.interpret(PGR);

module.exports = CPU;
