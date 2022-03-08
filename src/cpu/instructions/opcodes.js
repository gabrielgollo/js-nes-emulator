const opCodes = {
    0x00: () => {
        // BRK -- Force Break - 1 byte - 7 cycles
        this.p_counter += 1;
        this.status.setFlag("I", 1);
        this.status.setFlag("B", 1);
        this.stck_pointer = this.p_counter;
        this.p_counter = this.read(0xfffe);
        this.p_counter += this.read(0xffff) << 8;
        this.setInterrupt();
    },
    0xA9: (PGR) => {
        // LDA -- Load Accumulator - 2 bytes - 2 Cycles
        this.p_counter += 1;
        const param = PGR[this.p_counter];
        this.accumulator = param;

        this.status.setFlag("Z", this.accumulator === 0x0);
        this.status.setFlag("N", this.accumulator & 0x80);
    },
    0xAA: () => {
        // TAX Transfer Accumulator to X - 1 byte - 2 Cycles
        this.p_counter += 1;
        this.index_X = this.accumulator;
        this.status.setFlag("Z", this.index_X === 0x0);
        this.status.setFlag("N", (this.index_X & 0x80) !== 0);
    },
    0xE8: () => {
        // INX Increment X Index - 1 byte - 2 Cycles
        this.index_X += 1;
        this.status.setFlag("Z", this.index_X === 0x0);
        this.status.setFlag("N", (this.index_X & 0x80) !== 0);
    },
}

export default opCodes;