/**
 * @module Bits
 *
 * Low-level bit manipulation methods
 */

/**
 * TrailingZeros8 returns the number of trailing zero bits in b
 * the result is 8 for b == 0
 *
 * @param {number} byte - an 8-bit value
 * @returns {number}
 */
export function trailingZeros8 (byte) {
  const lsb = (byte & -byte)
  if (lsb === 0) { return 8 }
  return 31 - Math.clz32(lsb)
}

/**
 * TrailingZerosN returns the number of trailing zero bits in arr
 * the result is (s * 8) for the empty set
 * if (arr.length > s) only the leftmost s bytes are considered
 *
 * @param {Uint8Array} arr - an Uint8Array of length >= 4
 * @param {number} bc - byte count
 * @returns {number}
 */
export function trailingZerosN (arr, bc) {
  for (let i = (bc - 1); i >= 0; i--) {
    const z = trailingZeros8(arr[i])
    if (z < 8) return ((bc - 1 - i) * 8) + z
  }
  return bc * 8
}

/**
 * SetTrailing8 fills the rightmost n bits in byte with v
 *
 * @param {byte} byte - an 8-bit value
 * @param {byte} n - total bits to fill [0..8]
 * @param {boolean} v - value to fill [0,1]
 * @returns {byte}
 */
export function setTrailing8 (byte, n, v) {
  const mask = (1 << n) - 1
  return v ? byte | mask : byte & ~mask
}

/**
 * SetTrailingN fills the rightmost n bits in arr with v
 *
 * @param {Uint8Array} arr - an Uint8Array of length >= 8
 * @param {number} bc - byte count
 * @param {byte} n - total bits to fill [0..64]
 * @param {boolean} v - value to fill [0,1]
 */
export function setTrailingN (arr, bc, n, v) {
  for (let i = (bc - 1); i >= 0 && n > 0; i--) {
    const nn = Math.min(n, 8)
    arr[i] = setTrailing8(arr[i], nn, v)
    n -= nn
  }
}

/**
 * Flip8 flips the bit at position n in byte
 * bits are referenced 0-7 from lsb to msb (right to left)
 *
 * @param {byte} byte - an 8-bit value
 * @param {number} n - bit position [0..7]
 * @returns {byte}
 */
export function flip8 (byte, n) {
  return byte ^ (1 << n)
}

/**
 * FlipN sets the bit at position n in arr to v
 * bits are referenced [0..(n*8)-1] from lsb to msb (right to left)
 *
 * @param {Uint8Array} arr - an Uint8Array of length >= 8
 * @param {number} bc - byte count
 * @param {number} n - bit position [0..63]
 */
export function flipN (arr, bc, n, v) {
  const o = ((bc - 1) - (n >>> 3))
  arr[o] = flip8(arr[o], n & 0b111, v)
}

/**
 * Set8 sets the bit at position n in byte to v
 * bits are referenced 0-7 from lsb to msb (right to left)
 *
 * @param {byte} byte - an 8-bit value
 * @param {number} n - bit position [0..7]
 * @param {boolean} v - value to fill [0,1]
 * @returns {byte}
 */
export function set8 (byte, n, v) {
  const mask = (1 << n)
  return v ? byte | mask : byte & ~mask
}

/**
 * SetN sets the bit at position n in arr to v
 * bits are referenced [0..(n*8)-1] from lsb to msb (right to left)
 *
 * @param {Uint8Array} arr - an Uint8Array of length >= 8
 * @param {number} bc - byte count
 * @param {byte} n - total bits to fill [0..64]
 * @param {boolean} v - value to fill [0,1]
 */
export function setN (arr, bc, n, v) {
  const o = ((bc - 1) - (n >>> 3))
  arr[o] = set8(arr[o], n & 0b111, v)
}
