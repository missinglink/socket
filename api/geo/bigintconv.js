
/**
 * ToUint8Array converts a 64-bit BitInt number into
 * a BigEndian encoded Uint8Array(8)
 *
 * @param {BitInt} int - a 64-bit BitInt
 * @returns {Uint8Array}
 */
export function toUint8Array (int, arr = new Uint8Array(8)) {
  new DataView(arr.buffer, 0).setBigUint64(0, int, false)
  return arr
}

/**
 * FromUint8Array converts a BigEndian encoded Uint8Array(8)
 * into a 64-bit BitInt number
 *
 * @param {Uint8Array} arr - an Uint8Array of length 8
 * @returns {BitInt}
 */
export function fromUint8Array (arr) {
  return new DataView(arr.buffer, 0).getBigUint64(0, false)
}
