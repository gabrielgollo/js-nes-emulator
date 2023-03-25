const Cpu6502 = require("./Cpu6502");

class Bus {
  constructor() {
    this.ram = new Uint16Array(0xFFFF);
    this.CPU = Cpu6502(this.ram);
    this.PGR_ROM = new Uint8Array([0xa9, 0xc0, 0xaa]);
  }

  loadPGR_ROM(PGR_ROM) {
    this.PGR_ROM = PGR_ROM;
  }

  read(addr) {
    return this.ram[addr];
  }

  write(addr, value) {
    this.ram[addr] = value;
  }

  start() {
    this.CPU.interpret(this.PGR_ROM);
  }
}

const nes = new Bus();

nes.loadPGR_ROM(new Uint8Array([0xa9, 0x05, 0x00]));
nes.start();

module.exports = new Bus();
