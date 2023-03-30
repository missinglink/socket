import { getRandomValues } from '../crypto.js'
import Uint64 from './uint64.js'

/**
 * @module CellID
 *
 * This module provides an dependency-free & zero-copy
 * partial implementation of s2 CellID
 * 
 * @see s2geometry.io/devguide/s2cell_hierarchy
 */

/**
 * Instantiate a 64-bit CellID
 */
export default class CellID extends Uint64 {

  static numFaces = 6
  static maxLevel = 30

  /**
   * Face returns the cube face for this CellID, in the range [0, 5]
   * 
   * @see s2geometry.io/resources/earthcube
   * 
   * @returns {int}
   */
  face() {
    return (this[0] & 0b11100000) >>> (8-3)
  }

  /**
   * Level returns the subdivision level of this CellID, in the range [0, maxLevel]
   * the result is Inifity for an invalid cellid
   * 
   * @see s2geometry.io/resources/s2cell_statistics
   * 
   * @returns {int}
   */
  level() {
    let z = this.trailingZeros()
    if (z >= 64 || z%2 != 0) { return Infinity }
    return CellID.maxLevel - (z>>>1)
  }

  /**
   * Parent returns the CellID at the given level, which must be no 
   * greater than the current level
   * 
   * @param {number} level - target level
   * @returns {CellID}
   */
  parent(level) {
    let n = 2 * (CellID.maxLevel - level)
    return this.copy().setTrailingBits(n, 0).setBit(n, 1)
  }

  /**
   * RangeMin returns the minimum CellID that is contained within this CellID
   * 
   * @returns {CellID}
   */
  rangeMin() {
    return this.copy().setTrailingBits(this.trailingZeros()+1, 0).setBit(0, 1)
  }
  
  /**
   * RangeMax returns the maximum CellID that is contained within this CellID
   * 
   * @returns {CellID}
   */
  rangeMax() {
    return this.copy().setTrailingBits(this.trailingZeros(), 1)
  }

  /**
   * Contains returns true iff the CellID contains oci
   * 
   * @param {CellID} oci - subject cellid
   * @returns {boolean}
   */
  contains(oci) {
    return this.rangeMin() <= oci && oci <= this.rangeMax()
  }

  /**
   * Intersects returns true iff the CellID intersects oci
   * 
   * @param {CellID} oci - subject cellid
   * @returns {boolean}
   */
  intersects(oci) {
    return oci.rangeMin() <= this.rangeMax() && oci.rangeMax() >= this.rangeMin()
  }

  /**
   * Valid reports whether this CellID is valid
   * 
   * @returns {boolean}
   */
  valid() {
    return this.face() <= CellID.numFaces && this.level() <= CellID.maxLevel
  }

  /**
   * Copy returns a new CellID backed by a distinct copy of the underlying array
   * 
   * @returns {CellID}
   */
  copy() {
    return new CellID(this)
  }

  /**
   * Random returns a random CellID at the given level
   * 
   * @param {number} level - target level
   * @returns {CellID}
   */
  static random(level = CellID.maxLevel) {
    let c = new CellID()
    while (!c.valid() || c.level() < level) {
      getRandomValues(c)
    }
    return c.parent(level)
  }
}