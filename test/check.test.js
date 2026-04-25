import test from 'node:test'
import assert from 'node:assert/strict'
import { checkFile } from '../src/check.js'

test('good fixture scores higher than weak fixture', () => {
  const good = checkFile('fixtures/good.txt')
  const weak = checkFile('fixtures/weak.txt')
  assert.ok(good.score > weak.score)
  assert.ok(good.score >= 75)
})

test('weak fixture has at least one failure', () => {
  const weak = checkFile('fixtures/weak.txt')
  assert.ok(weak.results.some((result) => result.status === 'FAIL'))
})
