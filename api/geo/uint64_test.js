import { test } from '../test/index.js'
import Uint64 from './uint64.js'
import * as biconv from './bigintconv.js'

test('constructor', (t) => {
  t.throws(() => new Uint64(new Uint8Array(0)), /invalid bytes/)
  t.throws(() => new Uint64(new Uint8Array(7)), /invalid bytes/)
  t.throws(() => new Uint64([0, 0, 0, 0, 0, 0, 0, 0]), /invalid bytes/)
  t.ok(new Uint64())
  t.ok(new Uint64(0b10101010n))
  t.ok(new Uint64(new Uint8Array(8)))
  t.ok(new Uint64(new Uint8Array(8).buffer))
})

test('alloc', (t) => {
  const uint = new Uint64()
  t.ok(biconv.fromUint8Array(uint) === 0b0n)
})

test('zero-copy', (t) => {
  // source array (from external memory)
  const arr = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0b10101010])

  // source is passed by reference
  const uint = new Uint64(arr.buffer)
  t.equal(uint, 0b10101010n)

  // mutating the source arr refects changes in the uint
  arr[7] = 0b11111111
  t.equal(uint, 0b11111111n)
})

test('copy', (t) => {
  const uint1 = new Uint64(0b10101010n)
  t.equal(uint1, 0b10101010n)

  // uint2 contains a copy of the bytes from uint1
  const uint2 = uint1.copy()
  t.equal(uint2, 0b10101010n)

  // mutating uint1 doesn't change uint2
  uint1.valueFrom(0b11111111n)
  t.equal(uint1, 0b11111111n)
  t.equal(uint2, 0b10101010n)
})

test('valueOf', (t) => {
  t.equal(new Uint64().valueOf(), 0n)
  t.equal(new Uint64(0b10101010n).valueOf(), 0b10101010n)
})

test('valueFrom', (t) => {
  t.equal(new Uint64().valueFrom(0b10101010n), 0b10101010n)
})

test('toString', (t) => {
  t.equal(new Uint64(0b10101010n).toString(), '0000000000000000000000000000000000000000000000000000000010101010')
})
