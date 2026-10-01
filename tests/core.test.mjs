import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Keygen, LegacyRandom, LICENSE_TYPES, TARGETS, generateSerial, validateComputerId } from '../site/core.mjs';

const reference = JSON.parse(readFileSync(new URL('./fixtures/python-reference.json', import.meta.url)));

test('与 Python 的 535 组平台、许可、种子和 ASCII 边界结果一致', () => {
  assert.deepEqual(TARGETS, reference.targets);
  assert.deepEqual(LICENSE_TYPES, reference.licenses);
  assert.equal(reference.cases.length, 535);
  for (const row of reference.cases) {
    assert.equal(generateSerial(row.cid, row.license, row.target, row.seed), row.serial, JSON.stringify(row));
  }
});

test('80 次连续调用跨随机状态刷新，与 Python 会话一致', () => {
  const session = new Keygen(reference.sequence_seed);
  for (const row of reference.sequence) assert.equal(session.generate(row.cid, row.license, row.target), row.serial);
});

test('四个种子的 1300 个随机数逐字节摘要与 Python 一致', () => {
  for (const stream of reference.random_streams) {
    const rng = new LegacyRandom(stream.seed);
    const raw = Buffer.alloc(stream.count * 4);
    for (let i = 0; i < stream.count; i++) raw.writeUInt32LE(rng.uint32(), i * 4);
    assert.equal(createHash('sha256').update(raw).digest('hex'), stream.sha256);
  }
});

test('无效输入、选项和种子明确失败；失败不消耗随机流', () => {
  const engine = new Keygen(1);
  for (const cid of ['', null, 42, '12345678901', '12345-678901', '中文字符测试-测试测试', '12345-6789\n', '１２３４５-６７８９０']) {
    assert.throws(() => engine.generate(cid));
  }
  for (const option of [-1, 11, true, false, NaN, 1.5, {}, 'missing']) assert.throws(() => engine.generate('12345-67890', option));
  for (const target of [-1, 4, true, null, 'missing']) assert.throws(() => engine.generate('12345-67890', 0, target));
  for (const seed of [-1, 2 ** 32, true, null, NaN, Infinity, 1.5, '1']) assert.throws(() => new Keygen(seed));
  assert.equal(engine.generate('12345-67890'), 'GM82M-XXTF3-XH38J-USFTD-2GW9M-NB79L');
});

test('保留 ASCII 大小写和空格，名称选项与索引行为一致', () => {
  assert.equal(validateComputerId('     -     '), '     -     ');
  assert.equal(validateComputerId('abcde-fghij'), 'abcde-fghij');
  assert.equal(generateSerial('12345-67890', 'professional', 'arm', 1), generateSerial('12345-67890', 10, 3, 1));
});
