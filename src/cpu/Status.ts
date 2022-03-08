export interface StatusRegister {
    C: number;
    Z: number;
    I: number;
    D: number;
    B: number;
    U: number;
    V: number;
    N: number;
}

type StatusFlags = keyof StatusRegister;
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
  
    
  
    setFlag(flag: StatusFlags, value: boolean | number) {
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