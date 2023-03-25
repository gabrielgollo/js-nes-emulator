/**
 * Write code to NES RAM
 * @param {Uint16Array} ram - NES RAM
 * @param {Uint16Array} code - Code to write to NES RAM
 * @param {number} offset - Offset to start writing code to
 */
module.exports.writeCodeToNesRam = (ram, code, offset = 0) => {
    for (let i = 0; i < code.length; i++) {
        ram[i + offset] = code[i];
    }
}