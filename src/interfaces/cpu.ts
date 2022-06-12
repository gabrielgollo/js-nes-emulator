import CPU6502Status from "../cpu/Status";

export interface CPUInterface {
    memory: Uint8Array;
    accumulator: number;
    index_X: number;
    index_Y: number;
    stck_pointer: number;
    p_counter: number;
    status: CPU6502Status;
    interrupt: boolean;
    instructions: { [key:string]: (PGR_ROM: Uint8Array) => void };
}