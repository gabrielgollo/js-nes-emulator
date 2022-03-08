import { CPU } from '../../src/cpu/6502';
const cpu = new CPU({ ram: new Uint16Array(0xFFFF) });

describe("CPU", () => {
  beforeEach(() => {
    cpu.reset();
  });

  it("CPU should load to accumulator and transfer from a to x and interrupts", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0xc0, 0xaa]);
    try {
      cpu.interpret(PROGRAM_ROM);
    } catch (e) {
      //expect(e).toBeUndefined();
    }
    expect(cpu.accumulator).toBe(0xc0);
    expect(cpu.index_X).toBe(0xc0);
    expect(cpu.index_Y).toBe(0x0);
    expect(cpu.status.flags).toBe(0b1010_0000);
    expect(cpu.stck_pointer).toBe(0x0);
  });

  it("CPU case - LDA(0x05)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x05, 0x00]);
    cpu.interpret(PROGRAM_ROM);

    expect(cpu.accumulator).toBe(0x05);
    expect(cpu.index_X).toBe(0x0);
    expect(cpu.index_Y).toBe(0x0);
    expect(cpu.status.flags).toBe(0b0011_0100);
    expect(cpu.stck_pointer).toBe(0x3);
  });

  it("CPU case - LDA(0x00)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x00, 0x00]);
    cpu.interpret(PROGRAM_ROM);

    expect(cpu.accumulator).toBe(0x00);
    expect(cpu.index_X).toBe(0x0);
    expect(cpu.index_Y).toBe(0x0);
    expect(cpu.status.flags).toBe(0b0011_0110);
    expect(cpu.stck_pointer).toBe(0x3);
  });

  it("CPU case - LDA(0x81)->BRK", () => {
    const PROGRAM_ROM = new Uint8Array([0xa9, 0x81, 0x00]);
    cpu.interpret(PROGRAM_ROM);

    expect(cpu.accumulator).toBe(0x81);
    expect(cpu.index_X).toBe(0x0);
    expect(cpu.index_Y).toBe(0x0);
    expect(cpu.status.flags).toBe(0b1010_0000);
    expect(cpu.stck_pointer).toBe(0x0);
  });

  it("CPU case - INX", () => {
    const PROGRAM_ROM = new Uint8Array([0xe8, 0xe8, 0x00]);
    cpu.interpret(PROGRAM_ROM);

    expect(cpu.accumulator).toBe(0x0);
    expect(cpu.index_X).toBe(0b0000_0010);
    expect(cpu.index_Y).toBe(0b0);
    expect(cpu.status.flags).toBe(0b0011_0100);
    expect(cpu.stck_pointer).toBe(0x3);
  });
});
