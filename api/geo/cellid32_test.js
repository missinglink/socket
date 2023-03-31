import { test } from '../test/index.js'
import CellID32 from './cellid32.js'

test('face', (t) => {
  t.equal(new CellID32(0b00011111111111111111111111111111).face(), 0)
  t.equal(new CellID32(0b00111111111111111111111111111111).face(), 1)
  t.equal(new CellID32(0b01011111111111111111111111111111).face(), 2)
  t.equal(new CellID32(0b01111111111111111111111111111111).face(), 3)
  t.equal(new CellID32(0b10011111111111111111111111111111).face(), 4)
  t.equal(new CellID32(0b10111111111111111111111111111111).face(), 5)
})

test('level', (t) => {
  t.equal(new CellID32(0b00000000000000000000000000000001).level(), 14)
  t.equal(new CellID32(0b00000000000000000000000000000100).level(), 13)
  t.equal(new CellID32(0b00000000000000000000000000010000).level(), 12)
  t.equal(new CellID32(0b00000000000000000000000001000000).level(), 11)
  t.equal(new CellID32(0b00000000000000000000000100000000).level(), 10)
  t.equal(new CellID32(0b00000000000000000000010000000000).level(), 9)
  t.equal(new CellID32(0b00000000000000000001000000000000).level(), 8)
  t.equal(new CellID32(0b00000000000000000100000000000000).level(), 7)
  t.equal(new CellID32(0b00000000000000010000000000000000).level(), 6)
  t.equal(new CellID32(0b00000000000001000000000000000000).level(), 5)
  t.equal(new CellID32(0b00000000000100000000000000000000).level(), 4)
  t.equal(new CellID32(0b00000000010000000000000000000000).level(), 3)
  t.equal(new CellID32(0b00000001000000000000000000000000).level(), 2)
  t.equal(new CellID32(0b00000100000000000000000000000000).level(), 1)
  t.equal(new CellID32(0b00010000000000000000000000000000).level(), 0)
  t.equal(new CellID32(0b00000000000000000000000000000010).level(), Infinity)
  t.equal(new CellID32(0b00000000000000000000000000001000).level(), Infinity)
})

test('parent', (t) => {
  const l = new CellID32(0b00111100001111000011110000111101)
  t.deepEqual(l.parent(14), new CellID32(0b00111100001111000011110000111101))
  t.deepEqual(l.parent(1), new CellID32(0b00111100000000000000000000000000))
  t.deepEqual(l.parent(0), new CellID32(0b00110000000000000000000000000000))
})

test('range', (t) => {
  const c = new CellID32(0b00111100001111000000010000000000)
  t.deepEqual(c.rangeMin(), new CellID32(0b00111100001111000000000000000001))
  t.deepEqual(c.rangeMax(), new CellID32(0b00111100001111000000011111111111))
})

test('contains', (t) => {
  const c1 = new CellID32(0b00111100001111000011110000111101)
  t.ok(!c1.contains(c1.parent(10)))
  t.ok(c1.parent(10).contains(c1))

  const c2 = new CellID32(0b10111111111111111111111111111111)
  t.ok(!c2.contains(c2.parent(10)))
  t.ok(c2.parent(10).contains(c2))

  t.ok(!c1.contains(c2))
  t.ok(!c2.contains(c1))
})

test('intersects', (t) => {
  const c1 = new CellID32(0b00111100001111000011110000111101)
  t.ok(c1.intersects(c1.parent(10)))
  t.ok(c1.parent(10).intersects(c1))

  const c2 = new CellID32(0b10111111111111111111111111111111)
  t.ok(c2.intersects(c2.parent(10)))
  t.ok(c2.parent(10).intersects(c2))

  t.ok(!c1.intersects(c2))
  t.ok(!c2.intersects(c1))
})

test('valid', (t) => {
  t.ok(new CellID32(0b00000000000000000000000000000001).valid())
  t.ok(!new CellID32(0b11100000000000000000000000000001).valid(), 'face')
  t.ok(!new CellID32(0b00000000000000000000000000000010).valid(), 'level')
})

test('random', (t) => {
  for (let level = CellID32.maxLevel; level >= 0; level--) {
    const c = CellID32.random(level)
    t.ok(c.valid())
    t.equal(c.level(), level)
  }
})
