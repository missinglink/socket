import { getRandomValues } from '../crypto.js'
import Uint32 from './uint32.js'

/**
 * @module CellID32
 *
 * This module provides an dependency-free & zero-copy
 * partial implementation of s2 CellID using 32-bit integers
 * instead of the standard 64-bits.
 *
 * @see s2geometry.io/devguide/s2cell_hierarchy
 */

/**
 * Instantiate a 32-bit CellID32
 */
export default class CellID32 extends Uint32 {
  static numFaces = 6
  static maxLevel = 14

  /**
   * Face returns the cube face for this CellID32, in the range [0, 5]
   *
   * @see s2geometry.io/resources/earthcube
   *
   * @returns {int}
   */
  face () {
    return (this[0] & 0b11100000) >>> (8 - 3)
  }

  /**
   * Level returns the subdivision level of this CellID32, in the range [0, maxLevel]
   * the result is Inifity for an invalid cellid
   *
   * @see s2geometry.io/resources/s2cell_statistics
   *
   * @returns {int}
   */
  level () {
    const z = this.trailingZeros()
    if (z >= 32 || z % 2 !== 0) { return Infinity }
    return CellID32.maxLevel - (z >>> 1)
  }

  /**
   * Parent returns the CellID32 at the given level, which must be no
   * greater than the current level
   *
   * @param {number} level - target level
   * @returns {CellID32}
   */
  parent (level) {
    const n = 2 * (CellID32.maxLevel - level)
    return this.copy().setTrailingBits(n, 0).setBit(n, 1)
  }

  /**
   * RangeMin returns the minimum CellID32 that is contained within this CellID32
   *
   * @returns {CellID32}
   */
  rangeMin () {
    return this.copy().setTrailingBits(this.trailingZeros() + 1, 0).setBit(0, 1)
  }

  /**
   * RangeMax returns the maximum CellID32 that is contained within this CellID32
   *
   * @returns {CellID32}
   */
  rangeMax () {
    return this.copy().setTrailingBits(this.trailingZeros(), 1)
  }

  /**
   * Contains returns true iff the CellID32 contains oci
   *
   * @param {CellID32} oci - subject cellid
   * @returns {boolean}
   */
  contains (oci) {
    return this.rangeMin() <= oci && oci <= this.rangeMax()
  }

  /**
   * Intersects returns true iff the CellID32 intersects oci
   *
   * @param {CellID32} oci - subject cellid
   * @returns {boolean}
   */
  intersects (oci) {
    return oci.rangeMin() <= this.rangeMax() && oci.rangeMax() >= this.rangeMin()
  }

  /**
   * Valid reports whether this CellID32 is valid
   *
   * @returns {boolean}
   */
  valid () {
    return this.face() <= CellID32.numFaces && this.level() <= CellID32.maxLevel
  }

  /**
   * Copy returns a new CellID32 backed by a distinct copy of the underlying array
   *
   * @returns {CellID32}
   */
  copy () {
    return new CellID32(this)
  }

  /**
   * Random returns a random CellID32 at the given level
   *
   * @param {number} level - target level
   * @returns {CellID32}
   */
  static random (level = CellID32.maxLevel) {
    const c = new CellID32()
    while (!c.valid() || c.level() < level) {
      getRandomValues(c)
    }
    return c.parent(level)
  }
}
