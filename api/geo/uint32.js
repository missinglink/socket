import * as bits from './bits.js'

/**
 * @module Uint32
 *
 * Javascript lacks a native uint32 type
 * This module provides a zero-copy uint32 interface which wraps Uint8Array(8)
 */

/**
 * Create an instance of a 32-bit unsigned integer
 */
export default class Uint32 extends Uint8Array {

  /**
   * Constructor creates a new Uint32 backed by arr
   * if (arr.length > 4) only the leftmost 4 bytes are considered
   * 
   * @param {Uint8Array|ArrayBuffer|Number} arr - a TypedArray of length >= 4
   */
  constructor(init = new Uint8Array(4)) {
    if (typeof init === 'number') {
      let alloc = new Uint8Array(4)
      new DataView(alloc.buffer, 0).setUint32(0, init, false)
      init = alloc
    }
    if (!(init instanceof Uint8Array || init instanceof ArrayBuffer) || init.length < 4) {
      throw new Error('invalid bytes')
    }
    super(init)
  }

  /**
   * Copy returns a new Uint32 backed by a distinct copy of the underlying array
   * 
   * @returns {Uint32}
   */
  copy() {
    return new Uint32(this)
  }

  /**
   * ValueOf writes the underlying bytes to a Number
   * 
   * @returns {Number}
   */
  valueOf() {
    return new DataView(this.buffer, 0).getUint32(0, false)
  }

  /**
   * ValueFrom reads the underlying bytes from a Number
   * 
   * @param {Number} int - a 32-bit value
   * @returns {Uint32} - self
   */
  valueFrom(int) {
    new DataView(this.buffer, 0).setUint32(0, int, false)
    return this
  }

  /**
   * TrailingZeros returns the number of trailing zero bits
   * the result is 32 for an empty array
   * 
   * @returns {number}
   */
  trailingZeros() {
    return bits.trailingZerosN(this, 4)
  }

  /**
   * SetTrailingBits fills the rightmost n bits with v
   * 
   * @param {byte} n - total bits to fill [0..32]
   * @param {boolean} v - value to fill [0,1]
   * @returns {Uint32} - self
   */
  setTrailingBits(n, v) {
    bits.setTrailingN(this, 4, n, v)
    return this
  }

  /**
   * SetBit sets the bit at position n
   * bits are referenced 0-31 from lsb to msb (right to left)
   * 
   * @param {number} n - bit position [0..31]
   * @param {boolean} v - value to fill [0,1]
   * @returns {Uint32} - self
   */
  setBit(n, v) {
    bits.setN(this, 4, n, v)
    return this
  }

  /**
   * ToString returns a string representation of the underlying byte array
   * 
   * @returns {string}
   */
  toString() {
    return this.valueOf().toString(2).padStart(32, '0')
  }
}