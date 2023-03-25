const { Status } = require("./status");
const { INSTRUCTION } = require("./instruction");

class CPU {
  constructor(ram=new Uint16Array(0xFFFF)) {
    // Registers
    this.memory = ram; // 16 bits memory
    this.a = 0x0;
    this.x = 0x0;
    this.y = 0x0;
    this.stckp = 0x0; // stack pointer
    this.pc = 0x0; // Program counter
    this.status = new Status();
    this.interrupt = false; // flag to interrupt loop

    this.fetched = 0x0; // Fetched data
    this.addr_abs = 0x0; // Absolute address
    this.addr_rel = 0x0; // Relative address
    this.opcode = 0x0; // Current opcode
    this.cycles = 0x0; // Cycles left

    // Handler to read and write flags
    this.setFlag = (flag, value) => this.status.setFlag(flag, value);
    this.getFlag = this.status.getFlag;

    this.addressModes = {
      IMP: () => {
        this.fetched = this.a;
        return 0;
      }, // Implied
      IMM: () => {
        this.addr_abs = this.pc++;
        return 0;
      }, // Immediate
      ZP0: () => {
        this.addr_abs = this.read(this.pc);
        this.pc++;
        this.addr_abs &= 0x00ff;
        return 0;
      }, // Zero Page
      ZPX: () => {
        this.addr_abs = this.read(this.pc) + this.x;
        this.pc++;
        this.addr_abs &= 0x00ff;
        return 0;
      }, // Zero Page,X
      ZPY: () => {
        this.addr_abs = this.read(this.pc) + this.y;
        this.pc++;
        this.addr_abs &= 0x00ff;
        return 0;
      }, // Zero Page,Y
      REL: () => {
        this.addr_rel = this.read(this.pc);
        this.pc++;
        if (this.addr_rel & 0x80) {
          this.addr_rel |= 0xff00;
        }
        return 0;
      }, // Relative
      ABS: () => {
        const lo = this.read(this.pc);
        this.pc++;
        const hi = this.read(this.pc);
        this.pc++;
        this.addr_abs = (hi << 8) | lo;
        return 0;
      }, // Absolute
      ABX: () => {
        const lo = this.read(this.pc);
        this.pc++;
        const hi = this.read(this.pc);
        this.pc++;
        this.addr_abs = (hi << 8) | lo;
        this.addr_abs += this.x;
        if ((this.addr_abs & 0xff00) != (hi << 8)) {
          return 1;
        } else {
          return 0;
        }
      }, // Absolute,X
      ABY: () => {
        const lo = this.read(this.pc);
        this.pc++;
        const hi = this.read(this.pc);
        this.pc++;
        this.addr_abs = (hi << 8) | lo;
        this.addr_abs += this.y;
        if ((this.addr_abs & 0xff00) != (hi << 8)) {
          return 1;
        } else {
          return 0;
        }
      }, // Absolute,Y
      IND: () => {
        const ptr_lo = this.read(this.pc);
        this.pc++;
        const ptr_hi = this.read(this.pc);
        this.pc++;
        const ptr = (ptr_hi << 8) | ptr_lo;
        if (ptr_lo == 0x00ff) {
          // Simulate page boundary hardware bug
          this.addr_abs = (this.read(ptr & 0xff00) << 8) | this.read(ptr + 0);
        } else {
          // Behave normally
          this.addr_abs = (this.read(ptr + 1) << 8) | this.read(ptr + 0);
        }
        return 0;
      }, // Indirect
      IZX: () => {
        const t = this.read(this.pc);
        this.pc++;
        const lo = this.read((t + this.x) & 0x00ff);
        const hi = this.read((t + this.x + 1) & 0x00ff);
        this.addr_abs = (hi << 8) | lo;
        return 0;
      }, // (Indirect,X)
      IZY: () => {
        const t = this.read(this.pc);
        this.pc++;
        const lo = this.read(t & 0x00ff);
        const hi = this.read((t + 1) & 0x00ff);
        this.addr_abs = (hi << 8) | lo;
        this.addr_abs += this.y;
        if ((this.addr_abs & 0xff00) != (hi << 8)) {
          return 1;
        } else {
          return 0;
        }
      }, // (Indirect),Y
    }

    // Mnemonics set intructions
    this.opCodes = {
      ADC: () => {
        this.fetch();
        const temp = this.a + this.fetched + this.getFlag('C');
        this.setFlag('C', temp > 255);
        this.setFlag('Z', (temp & 0x00ff) == 0);
        this.setFlag('V', (~((this.a ^ this.fetched) & 0x80)) & ((this.a ^ temp) & 0x80));
        this.setFlag('N', temp & 0x80);

        this.a = temp & 0x00ff;
        return 1;
      }, // Add with Carry
      AND: () => {
        this.fetch();
        this.a = this.a & this.fetched;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 1;
      }, // Logical AND
      ASL: () => {
        this.fetch();
        const temp = this.fetched << 1;
        this.setFlag('C', (temp & 0xff00) > 0);
        this.setFlag('Z', (temp & 0x00ff) == 0x00);
        this.setFlag('N', temp & 0x80);
        if (this.lookup[this.opcode].addrmode == this.addressModes.IMP) {
          this.a = temp & 0x00ff;
        } else {
          this.write(this.addr_abs, temp & 0x00ff);
        }
        return 0;
      }, // Arithmetic Shift Left
      BCC: () => {
        if (this.getFlag('C') == 0) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if ((this.addr_abs & 0xff00) != (this.pc & 0xff00)) {
            this.cycles++;
          }
          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Carry Clear
      BCS: () => {
        if (this.getFlag('C') == 1) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if ((this.addr_abs & 0xff00) != (this.pc & 0xff00)) {
            this.cycles++;
          }
          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Carry Set
      BEQ: () => {
        if (this.getFlag('Z') == 1) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if ((this.addr_abs & 0xff00) != (this.pc & 0xff00)) {
            this.cycles++;
          }
          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Result Zero
      BIT: () => {
        this.fetch();
        const temp = this.a & this.fetched;
        this.setFlag('Z', (temp & 0x00ff) == 0x00);
        this.setFlag('N', this.fetched & (1 << 7));
        this.setFlag('V', this.fetched & (1 << 6));
        return 0;
      }, // Bit Test
      BMI: () => {
        if(this.getFlag("N") == 1) {
          this.cycles++;
          this.addr_abs = pc + addr_rel;
          if((addr_abs & 0xFF00) != (pc & 0xFF00)) this.cycles++;

          this.pc = addr_abs;
        }
        return 0;
      }, // Branch on Result Minus
      BNE: () => {
        if (this.getFlag('Z') == 0) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if ((this.addr_abs & 0xff00) != (this.pc & 0xff00)) this.cycles++;

          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Result not Zero
      BPL: () => {
        if(this.getFlag("N") == 0) {
          this.cycles++;
          this.addr_abs = pc + addr_rel;
          if((addr_abs & 0xFF00) != (pc & 0xFF00)) this.cycles++;

          this.pc = addr_abs;
        }
      }, // Branch on Result Plus
      BRK: () => {
        this.pc++;
        this.setFlag("I", 1);
        this.write(0x0100 + this.stckp, (this.pc >> 8) & 0x00ff);
        this.stckp--;
        this.write(0x0100 + this.stckp, this.pc & 0x00ff);
        this.stckp--;

        this.setFlag("B", 1);
        this.write(0x0100 + this.stckp, this.status);
      }, // Force Break
      BVC: () => {
        if(this.getFlag('V') == 0) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if((this.addr_abs & 0xFF00) != (this.pc & 0xFF00)) this.cycles++;

          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Overflow Clear
      BVS: () => {
        if(this.getFlag('V') == 1) {
          this.cycles++;
          this.addr_abs = this.pc + this.addr_rel;
          if((this.addr_abs & 0xFF00) != (this.pc & 0xFF00)) this.cycles++;

          this.pc = this.addr_abs;
        }
        return 0;
      }, // Branch on Overflow Set
      CLC: () => {
        this.setFlag('C', 0);
        return 0;
      }, // Clear Carry Flag
      CLD: () => {
        this.setFlag('D', 0);
        return 0;
      }, // Clear Decimal Mode
      CLI: () => {
        this.setFlag('I', 0);
        return 0;
      }, // Clear Interrupt Disable Bit
      CLV: () => {
        this.setFlag('V', 0);
        return 0;
      }, // Clear Overflow Flag
      CMP: () => {
        this.fetch();
        const temp = this.a - this.fetched;
        this.setFlag('C', this.a >= this.fetched);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        return 1;
      }, // Compare
      CPX: () => {
        this.fetch();
        const temp = this.x - this.fetched;
        this.setFlag('C', this.x >= this.fetched);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        return 0;
      }, // Compare X Register
      CPY: () => {
        this.fetch();
        const temp = this.y - this.fetched;
        this.setFlag('C', this.y >= this.fetched);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        return 0;
      }, // Compare Y Register
      DEC: () => {
        this.fetch();
        const temp = this.fetched - 1;
        this.write(this.addr_abs, temp & 0x00ff);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        return 0;
      }, // Decrement Memory
      DEX: () => {
        this.x--;
        this.setFlag('Z', this.x == 0x00);
        this.setFlag('N', this.x & 0x80);
        return 0;
      }, // Decrement X Register
      DEY: () => {
        this.y--;
        this.setFlag('Z', this.y == 0x00);
        this.setFlag('N', this.y & 0x80);
        return 0;
      }, // Decrement Y Register
      EOR: () => {
        this.fetch();
        this.a = this.a ^ this.fetched;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 1;
      }, // Exclusive OR
      INC: () => {
        this.fetch();
        const temp = this.fetched + 1;
        this.write(this.addr_abs, temp & 0x00ff);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        return 0;
      }, // Increment Memory
      INX: () => {
        this.x++;
        this.setFlag('Z', this.x == 0x00);
        this.setFlag('N', this.x & 0x80);
        return 0;
      }, // Increment X Register
      INY: () => {
        this.y++;
        this.setFlag('Z', this.y == 0x00);
        this.setFlag('N', this.y & 0x80);
        return 0;
      }, // Increment Y Register
      JMP: () => {
        this.pc = this.addr_abs;
        return 0;
      }, // Jump
      JSR: () => {
        this.pc--;
        this.write(0x0100 + this.stckp, (this.pc >> 8) & 0x00ff);
        this.stckp--;
        this.write(0x0100 + this.stckp, this.pc & 0x00ff);
        this.stckp--;
        this.pc = this.addr_abs;
        return 0;
      }, // Jump to Subroutine
      LDA: () => {
        this.fetch();
        this.a = this.fetched;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 1;
      }, // Load Accumulator
      LDX: () => {
        this.fetch();
        this.x = this.fetched;
        this.setFlag('Z', this.x == 0x00);
        this.setFlag('N', this.x & 0x80);
        return 1;
      }, // Load X Register
      LDY: () => {
        this.fetch();
        this.y = this.fetched;
        this.setFlag('Z', this.y == 0x00);
        this.setFlag('N', this.y & 0x80);
        return 1;
      }, // Load Y Register
      LSR: () => {
        this.fetch();
        this.setFlag('C', this.fetched & 0x0001);
        const temp = this.fetched >> 1;
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        if (this.lookup[this.opcode].addrmode == this.addressModes.IMP) {
          this.a = temp & 0x00ff;
        } else {
          this.write(this.addr_abs, temp & 0x00ff);
        }
        return 0;
      }, // Logical Shift Right
      NOP: () => {
        switch (this.opcode) {
          case 0x1c:
          case 0x3c:
          case 0x5c:
          case 0x7c:
          case 0xdc:
          case 0xfc:
            return 1;
        }
        return 0;
      }, // No Operation
      ORA: () => {
        this.fetch();
        this.a = this.a | this.fetched;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 1;
      }, // Logical Inclusive OR
      PHA: () => {
        this.write(0x0100 + this.stckp, this.a);
        this.stckp--;
        return 0;
      }, // Push Accumulator
      PHP: () => {
        this.write(0x0100 + this.stckp, this.status.flags | this.status.bitFlags.B | this.status.bitFlags.U); // MAYBE NEED TO CHANGE THIS
        this.setFlag('B', 0);
        this.setFlag('U', 0);
        this.stckp--;
        return 0;
      }, // Push Processor Status
      PLA: () => {
        this.stckp++;
        this.a = this.read(0x0100 + this.stckp);
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 0;
      }, // Pull Accumulator
      PLP: () => {
        this.stckp++;
        this.status.flags = this.read(0x0100 + this.stckp);
        this.setFlag('U', 1);
        return 0;
      }, // Pull Processor Status
      ROL: () => {
        this.fetch();
        const temp = (this.fetched << 1) | this.getFlag('C');
        this.setFlag('C', temp & 0xFF00);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        if (this.lookup[this.opcode].addrmode == this.addressModes.IMP) {
          this.a = temp & 0x00ff;
        } else {
          this.write(this.addr_abs, temp & 0x00ff);
        }
        return 0;
      }, // Rotate Left
      ROR: () => {
        this.fetch();
        const temp = (this.fetched >> 1) | (this.getFlag('C') << 7);
        this.setFlag('C', this.fetched & 0x0001);
        this.setFlag('Z', (temp & 0x00ff) == 0x0000);
        this.setFlag('N', temp & 0x0080);
        if (this.lookup[this.opcode].addrmode == this.addressModes.IMP) {
          this.a = temp & 0x00ff;
        } else {
          this.write(this.addr_abs, temp & 0x00ff);
        }
        return 0;
      }, // Rotate Right
      RTI: () => {
        this.stckp++;
        this.status.flags = this.read(0x0100 + this.stckp);
        this.status.flags &= ~this.status.bitFlags.B;
        this.status.flags &= ~this.status.bitFlags.U;

        this.stckp++;
        this.pc = this.read(0x0100 + this.stckp);
        this.stckp++;
        this.pc |= this.read(0x0100 + this.stckp) << 8;
        return 0;
      }, // Return from Interrupt
      RTS: () => {
        this.stckp++;
        this.pc = this.read(0x0100 + this.stckp);
        this.stckp++;
        this.pc |= this.read(0x0100 + this.stckp) << 8;

        this.pc++;
        return 0;
      }, // Return from Subroutine
      SBC: () => {
        this.fetch();
        const value = this.fetched ^ 0x00ff;
        const temp = this.a + value + this.status.getFlag('C');
        this.status.setFlag('C', temp & 0xff00);
        this.status.setFlag('Z', (temp & 0x00ff) == 0);
        this.status.setFlag('V', (temp ^ this.a) & (temp ^ value) & 0x0080);
        this.status.setFlag('N', temp & 0x0080);
        this.a = temp & 0x00ff;
        return 1;
      }, // Subtract with Carry
      SEC: () => {
        this.setFlag('C', 1);
        return 0;
      }, // Set Carry Flag
      SED: () => {
        this.setFlag('D', 1);
        return 0;
      }, // Set Decimal Mode
      SEI: () => {
        this.setFlag('I', 1);
        return 0;
      }, // Set Interrupt Flag
      STA: () => {
        this.write(this.addr_abs, this.a);
        return 0;
      }, // Store Accumulator
      STX: () => {
        this.write(this.addr_abs, this.x);
        return 0;
      }, // Store X Register
      STY: () => {
        this.write(this.addr_abs, this.y);
        return 0;
      }, // Store Y Register
      TAX: () => {
        this.x = this.a;
        this.setFlag('Z', this.x == 0x00);
        this.setFlag('N', this.x & 0x80);
        return 0;
      }, // Transfer Accumulator to X
      TAY: () => {
        this.y = this.a;
        this.setFlag('Z', this.y == 0x00);
        this.setFlag('N', this.y & 0x80);
        return 0;
      }, // Transfer Accumulator to Y
      TSX: () => {
        this.x = this.stckp;
        this.setFlag('Z', this.x == 0x00);
        this.setFlag('N', this.x & 0x80);
        return 0;
      }, // Transfer Stack Pointer to X
      TXA: () => {
        this.a = this.x;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 0;
      }, // Transfer X to Accumulator
      TXS: () => {
        this.stckp = this.x;
        return 0;
      }, // Transfer X to Stack Pointer
      TYA: () => {
        this.a = this.y;
        this.setFlag('Z', this.a == 0x00);
        this.setFlag('N', this.a & 0x80);
        return 0;
      }, // Transfer Y to Accumulator
      XXX: () => {
        return 0;
      }, // Any Illegal instruction
    }
    this.instrcts = {}
    this.instrcts[0x0] = new INSTRUCTION("BRK", this.opCodes.BRK, this.addressModes.IMP, 7); this.instrcts[0x1] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.IZX, 6); this.instrcts[0x2] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x4] = new INSTRUCTION("TSB", this.opCodes.TSB, this.addressModes.ZP0, 5); this.instrcts[0x5] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.ZP0, 3); this.instrcts[0x6] = new INSTRUCTION("ASL", this.opCodes.ASL, this.addressModes.ZP0, 5); this.instrcts[0x7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0x8] = new INSTRUCTION("PHP", this.opCodes.PHP, this.addressModes.IMP, 3); this.instrcts[0x9] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.IMM, 2); this.instrcts[0xa] = new INSTRUCTION("ASL", this.opCodes.ASL, this.addressModes.IMP, 2); this.instrcts[0xb] = new INSTRUCTION("???", this.opCodes.ANC, this.addressModes.IMP, 2); this.instrcts[0xc] = new INSTRUCTION("TSB", this.opCodes.TSB, this.addressModes.ABS, 6); this.instrcts[0xd] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.ABS, 4); this.instrcts[0xe] = new INSTRUCTION("ASL", this.opCodes.ASL, this.addressModes.ABS, 6); this.instrcts[0xf] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0x10] = new INSTRUCTION("BPL", this.opCodes.BPL, this.addressModes.REL, 2); this.instrcts[0x11] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.IZY, 5); this.instrcts[0x12] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0x13] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x14] = new INSTRUCTION("TRB", this.opCodes.TRB, this.addressModes.ZP0, 5); this.instrcts[0x15] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.ZPX, 4); this.instrcts[0x16] = new INSTRUCTION("ASL", this.opCodes.ASL, this.addressModes.ZPX, 6); this.instrcts[0x17] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x18] = new INSTRUCTION("CLC", this.opCodes.CLC, this.addressModes.IMP, 2); this.instrcts[0x19] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.ABY, 4); this.instrcts[0x1a] = new INSTRUCTION("INC", this.opCodes.INC, this.addressModes.IMP, 2); this.instrcts[0x1b] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0x1c] = new INSTRUCTION("TRB", this.opCodes.TRB, this.addressModes.ABS, 6); this.instrcts[0x1d] = new INSTRUCTION("ORA", this.opCodes.ORA, this.addressModes.ABX, 4); this.instrcts[0x1e] = new INSTRUCTION("ASL", this.opCodes.ASL, this.addressModes.ABX, 7); this.instrcts[0x1f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
    this.instrcts[0x20] = new INSTRUCTION("JSR", this.opCodes.JSR, this.addressModes.ABS, 6); this.instrcts[0x21] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.IZX, 6); this.instrcts[0x22] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x23] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x24] = new INSTRUCTION("BIT", this.opCodes.BIT, this.addressModes.ZP0, 3); this.instrcts[0x25] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.ZP0, 3); this.instrcts[0x26] = new INSTRUCTION("ROL", this.opCodes.ROL, this.addressModes.ZP0, 5); this.instrcts[0x27] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0x28] = new INSTRUCTION("PLP", this.opCodes.PLP, this.addressModes.IMP, 4); this.instrcts[0x29] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.IMM, 2); this.instrcts[0x2a] = new INSTRUCTION("ROL", this.opCodes.ROL, this.addressModes.IMP, 2); this.instrcts[0x2b] = new INSTRUCTION("???", this.opCodes.ANC, this.addressModes.IMP, 2); this.instrcts[0x2c] = new INSTRUCTION("BIT", this.opCodes.BIT, this.addressModes.ABS, 4); this.instrcts[0x2d] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.ABS, 4); this.instrcts[0x2e] = new INSTRUCTION("ROL", this.opCodes.ROL, this.addressModes.ABS, 6); this.instrcts[0x2f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0x30] = new INSTRUCTION("BMI", this.opCodes.BMI, this.addressModes.REL, 2); this.instrcts[0x31] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.IZY, 5); this.instrcts[0x32] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0x33] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x34] = new INSTRUCTION("BIT", this.opCodes.BIT, this.addressModes.ZPX, 4); this.instrcts[0x35] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.ZPX, 4); this.instrcts[0x36] = new INSTRUCTION("ROL", this.opCodes.ROL, this.addressModes.ZPX, 6); this.instrcts[0x37] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x38] = new INSTRUCTION("SEC", this.opCodes.SEC, this.addressModes.IMP, 2); this.instrcts[0x39] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.ABY, 4); this.instrcts[0x3a] = new INSTRUCTION("DEC", this.opCodes.DEC, this.addressModes.IMP, 2); this.instrcts[0x3b] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0x3c] = new INSTRUCTION("BIT", this.opCodes.BIT, this.addressModes.ABX, 4); this.instrcts[0x3d] = new INSTRUCTION("AND", this.opCodes.AND, this.addressModes.ABX, 4); this.instrcts[0x3e] = new INSTRUCTION("ROL", this.opCodes.ROL, this.addressModes.ABX, 7); this.instrcts[0x3f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
    this.instrcts[0x40] = new INSTRUCTION("RTI", this.opCodes.RTI, this.addressModes.IMP, 6); this.instrcts[0x41] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.IZX, 6); this.instrcts[0x42] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x43] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x44] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 3); this.instrcts[0x45] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.ZP0, 3); this.instrcts[0x46] = new INSTRUCTION("LSR", this.opCodes.LSR, this.addressModes.ZP0, 5); this.instrcts[0x47] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0x48] = new INSTRUCTION("PHA", this.opCodes.PHA, this.addressModes.IMP, 3); this.instrcts[0x49] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.IMM, 2); this.instrcts[0x4a] = new INSTRUCTION("LSR", this.opCodes.LSR, this.addressModes.IMP, 2); this.instrcts[0x4b] = new INSTRUCTION("???", this.opCodes.ALR, this.addressModes.IMP, 2); this.instrcts[0x4c] = new INSTRUCTION("JMP", this.opCodes.JMP, this.addressModes.ABS, 3); this.instrcts[0x4d] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.ABS, 4); this.instrcts[0x4e] = new INSTRUCTION("LSR", this.opCodes.LSR, this.addressModes.ABS, 6); this.instrcts[0x4f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0x50] = new INSTRUCTION("BVC", this.opCodes.BVC, this.addressModes.REL, 2); this.instrcts[0x51] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.IZY, 5); this.instrcts[0x52] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0x53] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x54] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 4); this.instrcts[0x55] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.ZPX, 4); this.instrcts[0x56] = new INSTRUCTION("LSR", this.opCodes.LSR, this.addressModes.ZPX, 6); this.instrcts[0x57] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x58] = new INSTRUCTION("CLI", this.opCodes.CLI, this.addressModes.IMP, 2); this.instrcts[0x59] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.ABY, 4); this.instrcts[0x5a] = new INSTRUCTION("PHY", this.opCodes.PHY, this.addressModes.IMP, 3); this.instrcts[0x5b] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0x5c] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 4); this.instrcts[0x5d] = new INSTRUCTION("EOR", this.opCodes.EOR, this.addressModes.ABX, 4); this.instrcts[0x5e] = new INSTRUCTION("LSR", this.opCodes.LSR, this.addressModes.ABX, 7); this.instrcts[0x5f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
    this.instrcts[0x60] = new INSTRUCTION("RTS", this.opCodes.RTS, this.addressModes.IMP, 6); this.instrcts[0x61] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.IZX, 6); this.instrcts[0x62] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x63] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x64] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 3); this.instrcts[0x65] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.ZP0, 3); this.instrcts[0x66] = new INSTRUCTION("ROR", this.opCodes.ROR, this.addressModes.ZP0, 5); this.instrcts[0x67] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0x68] = new INSTRUCTION("PLA", this.opCodes.PLA, this.addressModes.IMP, 4); this.instrcts[0x69] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.IMM, 2); this.instrcts[0x6a] = new INSTRUCTION("ROR", this.opCodes.ROR, this.addressModes.IMP, 2); this.instrcts[0x6b] = new INSTRUCTION("???", this.opCodes.ARR, this.addressModes.IMP, 2); this.instrcts[0x6c] = new INSTRUCTION("JMP", this.opCodes.JMP, this.addressModes.IND, 5); this.instrcts[0x6d] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.ABS, 4); this.instrcts[0x6e] = new INSTRUCTION("ROR", this.opCodes.ROR, this.addressModes.ABS, 6); this.instrcts[0x6f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0x70] = new INSTRUCTION("BVS", this.opCodes.BVS, this.addressModes.REL, 2); this.instrcts[0x71] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.IZY, 5); this.instrcts[0x72] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0x73] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0x74] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 4); this.instrcts[0x75] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.ZPX, 4); this.instrcts[0x76] = new INSTRUCTION("ROR", this.opCodes.ROR, this.addressModes.ZPX, 6); this.instrcts[0x77] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x78] = new INSTRUCTION("SEI", this.opCodes.SEI, this.addressModes.IMP, 2); this.instrcts[0x79] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.ABY, 4); this.instrcts[0x7a] = new INSTRUCTION("PLY", this.opCodes.PLY, this.addressModes.IMP, 4); this.instrcts[0x7b] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0x7c] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 4); this.instrcts[0x7d] = new INSTRUCTION("ADC", this.opCodes.ADC, this.addressModes.ABX, 4); this.instrcts[0x7e] = new INSTRUCTION("ROR", this.opCodes.ROR, this.addressModes.ABX, 7); this.instrcts[0x7f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
    this.instrcts[0x80] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x81] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.IZX, 6); this.instrcts[0x82] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x83] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x84] = new INSTRUCTION("STY", this.opCodes.STY, this.addressModes.ZP0, 3); this.instrcts[0x85] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.ZP0, 3); this.instrcts[0x86] = new INSTRUCTION("STX", this.opCodes.STX, this.addressModes.ZP0, 3); this.instrcts[0x87] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 3); this.instrcts[0x88] = new INSTRUCTION("DEY", this.opCodes.DEY, this.addressModes.IMP, 2); this.instrcts[0x89] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0x8a] = new INSTRUCTION("TXA", this.opCodes.TXA, this.addressModes.IMP, 2); this.instrcts[0x8b] = new INSTRUCTION("???", this.opCodes.XAA, this.addressModes.IMP, 2); this.instrcts[0x8c] = new INSTRUCTION("STY", this.opCodes.STY, this.addressModes.ABS, 4); this.instrcts[0x8d] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.ABS, 4); this.instrcts[0x8e] = new INSTRUCTION("STX", this.opCodes.STX, this.addressModes.ABS, 4); this.instrcts[0x8f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4);
    this.instrcts[0x90] = new INSTRUCTION("BCC", this.opCodes.BCC, this.addressModes.REL, 2); this.instrcts[0x91] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.IZY, 6); this.instrcts[0x92] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0x93] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0x94] = new INSTRUCTION("STY", this.opCodes.STY, this.addressModes.ZPX, 4); this.instrcts[0x95] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.ZPX, 4); this.instrcts[0x96] = new INSTRUCTION("STX", this.opCodes.STX, this.addressModes.ZPY, 4); this.instrcts[0x97] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0x98] = new INSTRUCTION("TYA", this.opCodes.TYA, this.addressModes.IMP, 2); this.instrcts[0x99] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.ABY, 5); this.instrcts[0x9a] = new INSTRUCTION("TXS", this.opCodes.TXS, this.addressModes.IMP, 2); this.instrcts[0x9b] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0x9c] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 5); this.instrcts[0x9d] = new INSTRUCTION("STA", this.opCodes.STA, this.addressModes.ABX, 5); this.instrcts[0x9e] = new INSTRUCTION("???", this.opCodes.NOP, this.addressModes.IMP, 5); this.instrcts[0x9f] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5);
    this.instrcts[0xa0] = new INSTRUCTION("LDY", this.opCodes.LDY, this.addressModes.IMM, 2); this.instrcts[0xa1] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.IZX, 6); this.instrcts[0xa2] = new INSTRUCTION("LDX", this.opCodes.LDX, this.addressModes.IMM, 2); this.instrcts[0xa3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0xa4] = new INSTRUCTION("LDY", this.opCodes.LDY, this.addressModes.ZP0, 3); this.instrcts[0xa5] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.ZP0, 3); this.instrcts[0xa6] = new INSTRUCTION("LDX", this.opCodes.LDX, this.addressModes.ZP0, 3); this.instrcts[0xa7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 3); this.instrcts[0xa8] = new INSTRUCTION("TAY", this.opCodes.TAY, this.addressModes.IMP, 2); this.instrcts[0xa9] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.IMM, 2); this.instrcts[0xaa] = new INSTRUCTION("TAX", this.opCodes.TAX, this.addressModes.IMP, 2); this.instrcts[0xab] = new INSTRUCTION("???", this.opCodes.XAA, this.addressModes.IMP, 2); this.instrcts[0xac] = new INSTRUCTION("LDY", this.opCodes.LDY, this.addressModes.ABS, 4); this.instrcts[0xad] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.ABS, 4); this.instrcts[0xae] = new INSTRUCTION("LDX", this.opCodes.LDX, this.addressModes.ABS, 4); this.instrcts[0xaf] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4);
    this.instrcts[0xb0] = new INSTRUCTION("BCS", this.opCodes.BCS, this.addressModes.REL, 2); this.instrcts[0xb1] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.IZY, 5); this.instrcts[0xb2] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xb3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0xb4] = new INSTRUCTION("LDY", this.opCodes.LDY, this.addressModes.ZPX, 4); this.instrcts[0xb5] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.ZPX, 4); this.instrcts[0xb6] = new INSTRUCTION("LDX", this.opCodes.LDX, this.addressModes.ZPY, 4); this.instrcts[0xb7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xb8] = new INSTRUCTION("CLV", this.opCodes.CLV, this.addressModes.IMP, 2); this.instrcts[0xb9] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.ABY, 4); this.instrcts[0xba] = new INSTRUCTION("TSX", this.opCodes.TSX, this.addressModes.IMP, 2); this.instrcts[0xbb] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xbc] = new INSTRUCTION("LDY", this.opCodes.LDY, this.addressModes.ABX, 4); this.instrcts[0xbd] = new INSTRUCTION("LDA", this.opCodes.LDA, this.addressModes.ABX, 4); this.instrcts[0xbe] = new INSTRUCTION("LDX", this.opCodes.LDX, this.addressModes.ABY, 4); this.instrcts[0xbf] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4);
    this.instrcts[0xc0] = new INSTRUCTION("CPY", this.opCodes.CPY, this.addressModes.IMM, 2); this.instrcts[0xc1] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.IZX, 6); this.instrcts[0xc2] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xc3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0xc4] = new INSTRUCTION("CPY", this.opCodes.CPY, this.addressModes.ZP0, 3); this.instrcts[0xc5] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.ZP0, 3); this.instrcts[0xc6] = new INSTRUCTION("DEC", this.opCodes.DEC, this.addressModes.ZP0, 5); this.instrcts[0xc7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0xc8] = new INSTRUCTION("INY", this.opCodes.INY, this.addressModes.IMP, 2); this.instrcts[0xc9] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.IMM, 2); this.instrcts[0xca] = new INSTRUCTION("DEX", this.opCodes.DEX, this.addressModes.IMP, 2); this.instrcts[0xcb] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xcc] = new INSTRUCTION("CPY", this.opCodes.CPY, this.addressModes.ABS, 4); this.instrcts[0xcd] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.ABS, 4); this.instrcts[0xce] = new INSTRUCTION("DEC", this.opCodes.DEC, this.addressModes.ABS, 6); this.instrcts[0xcf] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0xd0] = new INSTRUCTION("BNE", this.opCodes.BNE, this.addressModes.REL, 2); this.instrcts[0xd1] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.IZY, 5); this.instrcts[0xd2] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xd3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0xd4] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xd5] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.ZPX, 4); this.instrcts[0xd6] = new INSTRUCTION("DEC", this.opCodes.DEC, this.addressModes.ZPX, 6); this.instrcts[0xd7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0xd8] = new INSTRUCTION("CLD", this.opCodes.CLD, this.addressModes.IMP, 2); this.instrcts[0xd9] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.ABY, 4); this.instrcts[0xda] = new INSTRUCTION("NOP", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0xdb] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0xdc] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xdd] = new INSTRUCTION("CMP", this.opCodes.CMP, this.addressModes.ABX, 4); this.instrcts[0xde] = new INSTRUCTION("DEC", this.opCodes.DEC, this.addressModes.ABX, 7); this.instrcts[0xdf] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
    this.instrcts[0xe0] = new INSTRUCTION("CPX", this.opCodes.CPX, this.addressModes.IMM, 2); this.instrcts[0xe1] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.IZX, 6); this.instrcts[0xe2] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xe3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0xe4] = new INSTRUCTION("CPX", this.opCodes.CPX, this.addressModes.ZP0, 3); this.instrcts[0xe5] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.ZP0, 3); this.instrcts[0xe6] = new INSTRUCTION("INC", this.opCodes.INC, this.addressModes.ZP0, 5); this.instrcts[0xe7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 5); this.instrcts[0xe8] = new INSTRUCTION("INX", this.opCodes.INX, this.addressModes.IMP, 2); this.instrcts[0xe9] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.IMM, 2); this.instrcts[0xea] = new INSTRUCTION("NOP", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0xeb] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xec] = new INSTRUCTION("CPX", this.opCodes.CPX, this.addressModes.ABS, 4); this.instrcts[0xed] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.ABS, 4); this.instrcts[0xee] = new INSTRUCTION("INC", this.opCodes.INC, this.addressModes.ABS, 6); this.instrcts[0xef] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6);
    this.instrcts[0xf0] = new INSTRUCTION("BEQ", this.opCodes.BEQ, this.addressModes.REL, 2); this.instrcts[0xf1] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.IZY, 5); this.instrcts[0xf2] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 2); this.instrcts[0xf3] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 8); this.instrcts[0xf4] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xf5] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.ZPX, 4); this.instrcts[0xf6] = new INSTRUCTION("INC", this.opCodes.INC, this.addressModes.ZPX, 6); this.instrcts[0xf7] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 6); this.instrcts[0xf8] = new INSTRUCTION("SED", this.opCodes.SED, this.addressModes.IMP, 2); this.instrcts[0xf9] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.ABY, 4); this.instrcts[0xfa] = new INSTRUCTION("NOP", this.opCodes.NOP, this.addressModes.IMP, 2); this.instrcts[0xfb] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7); this.instrcts[0xfc] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 4); this.instrcts[0xfd] = new INSTRUCTION("SBC", this.opCodes.SBC, this.addressModes.ABX, 4); this.instrcts[0xfe] = new INSTRUCTION("INC", this.opCodes.INC, this.addressModes.ABX, 7); this.instrcts[0xff] = new INSTRUCTION("???", this.opCodes.XXX, this.addressModes.IMP, 7);
  }
  read(address) {
    return this.memory[address];
  }

  write(address, value) {
    this.memory[address] = value;
  }

  complete() {
    return this.cycles === 0;
  }

  clock() {
    if(this.cycles === 0) {
      this.opcode= this.read(this.pc); // linear number

      this.setFlag('U', true);

      this.pc++;

      this.cycles = this.instrcts[this.opcode].cycles;
      const additionalCycles1 = this.instrcts[this.opcode].addressMode();
      const additionalCycles2 = this.instrcts[this.opcode].opcode();
      this.cycles += (additionalCycles1 & additionalCycles2);
      this.setFlag('U', true);
    }

    this.cycles--;
  }
  
  irq() {
    if(this.getFlag('I') === 0) {
      this.write(0x0100 + this.stckp, (this.pc >> 8) & 0x00ff);
      this.stckp--;
      this.write(0x0100 + this.stckp, this.pc & 0x00ff);
      this.stckp--;

      this.setFlag('B', 0);
      this.setFlag('U', 1);
      this.setFlag('I', 1);
      this.write(0x0100 + this.stckp, this.status.flags);
      this.stckp--;

      this.addr_abs = 0xfffe;
      const lo = this.read(this.addr_abs + 0);
      const hi = this.read(this.addr_abs + 1);
      this.pc = (hi << 8) | lo;

      this.cycles = 7;
    }
  }

  nmi() {
    this.write(0x0100 + this.stckp, (this.pc >> 8) & 0x00ff);
    this.stckp--;
    this.write(0x0100 + this.stckp, this.pc & 0x00ff);
    this.stckp--;

    this.setFlag('B', 0);
    this.setFlag('U', 1);
    this.setFlag('I', 1);
    this.write(0x0100 + this.stckp, this.status.flags);
    this.stckp--;

    this.addr_abs = 0xfffa;
    const lo = this.read(this.addr_abs + 0);
    const hi = this.read(this.addr_abs + 1);
    this.pc = (hi << 8) | lo;

    this.cycles = 8;
  }

  reset() {
    this.addr_abs = 0xfffc;
    const lo = this.read(this.addr_abs + 0);
    const hi = this.read(this.addr_abs + 1);

    this.pc = (hi << 8) | lo;

    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.stckp = 0xfd;
    this.status.flags = 0x00 | this.status.U;

    this.addr_rel = 0x0000;
    this.addr_abs = 0x0000;
    this.fetched = 0x00;

    this.cycles = 8;
  }
  
  fetch() {
    if(!this.instrcts[this.opcode].addressMode == this.addressModes.IMP) {
      this.fetched = this.read(this.addrAbs);
    }
    return this.fetched;
  }



  printCpuRegisters() {
    console.log(
      `A:${this.a.toString(16)} X:${this.x.toString(
        16
      )} Y:${this.y.toString(16)} S:${this.stckp.toString(
        16
      )} P:${this.status.flags.toString(2)} pc:${this.pc.toString(16)}`
    );
  }

}

module.exports = { CPU };
