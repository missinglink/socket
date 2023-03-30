import * as biconv from './bigintconv.js'
import * as bits from './bits.js'

/**
 * @module Uint64
 *
 * Javascript lacks a native uint64 type
 * This module provides a zero-copy uint64 interface which wraps Uint8Array(8)
 */

/**
 * Create an instance of a 64-bit unsigned integer
 */
export default class Uint64 extends Uint8Array {

  /**
   * Constructor creates a new Uint64 backed by arr
   * if (arr.length > 8) only the leftmost 8 bytes are considered
   * 
   * @param {Uint8Array|ArrayBuffer|BigInt} arr - a TypedArray of length >= 8
   */
  constructor(init = new Uint8Array(8)) {
    if (typeof init === 'bigint') {
      let alloc = new Uint8Array(8)
      new DataView(alloc.buffer, 0).setBigUint64(0, init, false)
      init = alloc
    }
    if (!(init instanceof Uint8Array || init instanceof ArrayBuffer) || init.length < 8) {
      throw new Error('invalid bytes')
    }
    super(init)
  }

  /**
   * Copy returns a new Uint64 backed by a distinct copy of the underlying array
   * 
   * @returns {Uint64}
   */
  copy() {
    return new Uint64(this)
  }

  /**
   * ValueOf writes the underlying bytes to a BigInt
   * 
   * @returns {BigInt}
   */
  valueOf() {
    return biconv.fromUint8Array(this)
  }

  /**
   * ValueFrom reads the underlying bytes from a BigInt 
   * 
   * @param {BigInt} int - a 64-bit BigInt value
   * @returns {Uint64} - self
   */
  valueFrom(int) {
    return biconv.toUint8Array(int, this)
  }

  /**
   * TrailingZeros returns the number of trailing zero bits
   * the result is 64 for an empty array
   * 
   * @returns {number}
   */
  trailingZeros() {
    return bits.trailingZerosN(this, 8)
  }

  /**
   * SetTrailingBits fills the rightmost n bits with v
   * 
   * @param {byte} n - total bits to fill [0..64]
   * @param {boolean} v - value to fill [0,1]
   * @returns {Uint32} - self
   */
  setTrailingBits(n, v) {
    bits.setTrailingN(this, 8, n, v)
    return this
  }

  /**
   * SetBit sets the bit at position n
   * bits are referenced 0-63 from lsb to msb (right to left)
   * 
   * @param {number} n - bit position [0..63]
   * @param {boolean} v - value to fill [0,1]
   * @returns {Uint32} - self
   */
  setBit(n, v) {
    bits.setN(this, 8, n, v)
    return this
  }

  /**
   * ToString returns a string representation of the underlying byte array
   * 
   * @returns {string}
   */
  toString() {
    return this.valueOf().toString(2).padStart(64, '0')
  }
}