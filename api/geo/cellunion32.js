import CellID32 from './cellid32.js'

/**
 * @module CellUnion32
 *
 * This module provides an dependency-free partial
 * implementation of s2 CellUnion32
 */

/**
 * Instantiate a 32-bit CellUnion32
 */
export default class CellUnion32 {
  constructor (data = []) {
    this.data = [...data]
  }

  /**
   * Compress cells such that the resulting union contains $max cells
   */
  compress (max) {
    const s = new Set(this.data.map(c => c.valueOf()))

    while (s.size > max) {
      for (const n of s) {
        const c = new CellID32(n)
        s.delete(n)
        s.add(c.parent(c.level() - 1).valueOf())
        if (s.size <= max) break
      }
    }

    return new CellUnion32(Array.from(s).map(n => new CellID32(n)))
  }
}
