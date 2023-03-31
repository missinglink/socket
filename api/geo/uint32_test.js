import { test } from '../test/index.js'
import Uint32 from './uint32.js'

test('constructor', (t) => {
  t.throws(() => new Uint32(new Uint8Array(0)), /invalid bytes/)
  t.throws(() => new Uint32(new Uint8Array(3)), /invalid bytes/)
  t.throws(() => new Uint32([0, 0, 0, 0]), /invalid bytes/)
  t.ok(new Uint32())
  t.ok(new Uint32(0b10101010))
  t.ok(new Uint32(new Uint8Array(4)))
  t.ok(new Uint32(new Uint8Array(4).buffer))
})

test('alloc', (t) => {
  const uint = new Uint32()
  t.equal(uint, 0b0)
})

test('zero-copy', (t) => {
  // source array (from external memory)
  const arr = new Uint8Array([0, 0, 0, 0b10101010])

  // source is passed by reference
  const uint = new Uint32(arr.buffer)
  t.equal(uint, 0b10101010)

  // mutating the source arr refects changes in the uint
  arr[3] = 0b11111111
  t.equal(uint, 0b11111111)
})

test('copy', (t) => {
  const uint1 = new Uint32(0b10101010)
  t.equal(uint1, 0b10101010)

  // uint2 contains a copy of the bytes from uint1
  const uint2 = uint1.copy()
  t.equal(uint2, 0b10101010)

  // mutating uint1 doesn't change uint2
  uint1.valueFrom(0b11111111)
  t.equal(uint1, 0b11111111)
  t.equal(uint2, 0b10101010)
})

test('valueOf', (t) => {
  t.equal(new Uint32().valueOf(), 0)
  t.equal(new Uint32(new Uint8Array([0, 0, 0, 0b10101010])).valueOf(), 0b10101010)
})

test('valueFrom', (t) => {
  t.equal(new Uint32().valueFrom(0b10101010), 0b10101010)
})

test('toString', (t) => {
  t.equal(new Uint32(0b10101010).toString(), '00000000000000000000000010101010')
})
