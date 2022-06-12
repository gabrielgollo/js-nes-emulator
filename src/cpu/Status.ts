import { CPUStatus, StatusRegister } from "../interfaces/status";

type StatusFlags = keyof StatusRegister;
export class CPU6502Status implements CPUStatus {
    status: StatusRegister;
    constructor() {
      this.status = {
        C: 0,
        Z: 0,
        I: 0,
        D: 0,
        B: 0,
        U: 1,
        V: 0,
        N: 0
      } 
    }
    
    setFlag(flag: StatusFlags, value: boolean | number) {
      if (value) {
        this.status[flag] = 1;
      } else {
        this.status[flag] = 0;
      }
    }
  
    getFlag(flag: StatusFlags) {
      return this.status[flag];
    }
  
    get flags() {
      const flags =
        "0b" +
        this.status.N +
        this.status.V +
        this.status.U +
        this.status.B +
        this.status.D +
        this.status.I +
        this.status.Z +
        this.status.C;
      return Number(flags);
    }
  
    resetFlags() {
      this.setFlag("N", 0);
      this.setFlag("V", 0);
      this.setFlag("U", 1);
      this.setFlag("B", 0);
      this.setFlag("D", 0);
      this.setFlag("I", 0);
      this.setFlag("Z", 0);
      this.setFlag("C", 0);
    }
  }

  export default CPU6502Status;