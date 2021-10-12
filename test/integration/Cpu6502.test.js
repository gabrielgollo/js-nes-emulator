const CPU = require("../../src/Cpu6502");

describe("CPU", () => {
  it("CPU should read some instruction and change his registers", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0xc0, 0xaa]);
    CPU.interpret(PROGRAM_ROM);

    expect(CPU.accumulator).toBe(0xc0);
    expect(CPU.index_X).toBe(0xc0);
    expect(CPU.index_Y).toBe(0x0);
    expect(CPU.status).toBe(0b1000_0000);
    expect(CPU.stck_pointer).toBe(0);
  });
});
