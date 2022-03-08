const Cpu6502 = require("./Cpu6502");

class Bus {
  constructor() {
    this.ram = new Int8Array(64 * 1024);
    this.CPU = new Cpu6502(this);
    this.PGR_ROM = new Uint8Array([0xa9, 0xc0, 0xaa]);
  }

  loadPGR_ROM(PGR_ROM) {
    this.PGR_ROM = PGR_ROM;
  }

  read(addr) {
    if (addr >= 0x0000 && addr <= 0xFFFF) return this.ram[addr];

    console.log("Invalid address: " + addr.toString(16));
    return 0;

  }

  write(addr, value) {
    if (addr >= 0x0000 && addr <= 0xFFFF) {
      this.ram[addr] = value;
    } else {
      console.log("Invalid address: " + addr.toString(16));
    }

  }

  start() {
    this.CPU.interpret(this.PGR_ROM);
  }
}

const nes = new Bus();

nes.loadPGR_ROM(new Uint8Array([0xa9, 0x05, 0x00]));
nes.start();

module.exports = new Bus();
