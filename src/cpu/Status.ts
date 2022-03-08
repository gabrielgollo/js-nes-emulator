export interface StatusRegister {
    C: number;
    Z: number;
    I: number;
    D: number;
    B: number;
    U: number;
    V: number;
    N: number;
    setFlag(flag: string, value: number): void;
  }
export  class Status {
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
  
    
  
    setFlag(flag, value) {
      if (value) {
        this[flag] = 1;
      } else {
        this[flag] = 0;
      }
    }
  
    getFlag(flag) {
      return this[flag];
    }
  
    get flags() {
      const flags =
        "0b" +
        this.N +
        this.V +
        this.U +
        this.B +
        this.D +
        this.I +
        this.Z +
        this.C;
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