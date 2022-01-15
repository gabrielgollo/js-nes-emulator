const CPU = require("../../src/Cpu6502");

describe("CPU", () => {
  beforeEach(() => {
    CPU.reset();
  });

  it("CPU should load to accumulator and transfer from a to x and interrupts", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0xc0, 0xaa]);
    try {
      CPU.interpret(PROGRAM_ROM);
    } catch (e) {
      //expect(e).toBeUndefined();
    }
    expect(CPU.accumulator).toBe(0xc0);
    expect(CPU.index_X).toBe(0xc0);
    expect(CPU.index_Y).toBe(0x0);
    expect(CPU.status.flags).toBe(0b1010_0000);
    expect(CPU.stck_pointer).toBe(0x0);
  });

  it("CPU case - LDA(0x05)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x05, 0x00]);
    CPU.interpret(PROGRAM_ROM);

    expect(CPU.accumulator).toBe(0x05);
    expect(CPU.index_X).toBe(0x0);
    expect(CPU.index_Y).toBe(0x0);
    expect(CPU.status.flags).toBe(0b0011_0100);
    expect(CPU.stck_pointer).toBe(0x3);
  });

  it("CPU case - LDA(0x00)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x00, 0x00]);
    CPU.interpret(PROGRAM_ROM);

    expect(CPU.accumulator).toBe(0x00);
    expect(CPU.index_X).toBe(0x0);
    expect(CPU.index_Y).toBe(0x0);
    expect(CPU.status.flags).toBe(0b0011_0110);
    expect(CPU.stck_pointer).toBe(0x3);
  });

  it("CPU case - LDA(0x81)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x81, 0x00]);
    CPU.interpret(PROGRAM_ROM);

    expect(CPU.accumulator).toBe(0x81);
    expect(CPU.index_X).toBe(0x0);
    expect(CPU.index_Y).toBe(0x0);
    expect(CPU.status.flags).toBe(0b1010_0000);
    expect(CPU.stck_pointer).toBe(0x0);
  });

  it("CPU case - INX", () => {
    const PROGRAM_ROM = new Uint8Array([0xe8, 0xe8, 0x00]);
    CPU.interpret(PROGRAM_ROM);

    expect(CPU.accumulator).toBe(0x0);
    expect(CPU.index_X).toBe(0b0000_0010);
    expect(CPU.index_Y).toBe(0b0);
    expect(CPU.status.flags).toBe(0b0011_0100);
    expect(CPU.stck_pointer).toBe(0x3);
  });
});
