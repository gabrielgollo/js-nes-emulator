import { StatusRegister } from "./Status";

export class CPU {
  memory: Uint16Array;
  accumulator: number;
  index_X: number;
  index_Y: number;
  stck_pointer: number;
  p_counter: number;
  status: StatusRegister;
  interrupt: boolean;
  constructor(this_bus) {
    // Registers
    this.memory = this.bus.ram; // 16 bits memory
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
