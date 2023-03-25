/**
 * 
 * @param {string} stringCode 
 * @returns {Uint16Array}
 */
module.exports.convertStringCodeToUint16Array= (stringCode) => {
    return stringCode.split(" ").map((byte) => parseInt(byte, 16));
}