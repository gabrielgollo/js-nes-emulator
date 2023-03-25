const { CPU: cpuClass } = require("../../src/CPU/6502");
const { convertStringCodeToUint16Array } = require("../../src/utils/convertStringCodeToUint16Array");
const { writeCodeToNesRam } = require("../../src/utils/writeCodeToNesRam");
const CPU = new cpuClass();

describe("CPU", () => {
  beforeEach(() => {
    CPU.reset();
  });

  it("should be able to reset", () => {
    const stringCode = "A2 0A 8E 00 00 A2 03 8E 01 00 AC 00 00 A9 00 18 6D 01 00 88 D0 FA 8D 02 00 EA EA EA"
    const code = convertStringCodeToUint16Array(stringCode);
    writeCodeToNesRam(CPU.memory, code, 0x8000);

    do {
      CPU.clock();
    } while (!CPU.complete())

    expect(CPU.x).toBe(0x0A);
    expect(CPU.pc).toBe(0x8002);
  })
});
