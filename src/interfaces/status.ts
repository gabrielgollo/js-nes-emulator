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

export type StatusFlags = keyof StatusRegister;

export interface CPUStatus {
    status: StatusRegister;
    resetFlags(): void;
    setFlag(flag: StatusFlags, value: boolean | number): void;
    getFlag(flag: StatusFlags): number;
    get flags(): number;

}