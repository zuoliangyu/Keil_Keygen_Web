/** 对照 desktop-archive/keil_core.py 移植；保持旧式随机流与字节运算。 */
export const TARGETS = Object.freeze(['C51', 'C251', 'C166', 'ARM']);
export const LICENSE_TYPES = Object.freeze([
  'Prof. Developers Kit (Plus)', 'Developers Kit', 'Macro Assembler Kit',
  'Compiler/Assembler Kit', 'Real-Time OS', 'Debugger', 'Hitex Extensions',
  'Infineon Extensions', 'Standard Cortex-M only',
  'Professional Cortex-M only', 'Professional',
]);

const HASH_POSITIONS = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 15, 16, 18, 19, 20, 21, 22];
const SUM_POSITIONS = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 25, 26, 27, 28, 30, 32, 33, 34];
const ENCODE_POSITIONS = [22, 21, 20, 19, 18, 16, 15, 13, 12, 10, 9, 8, 7, 6, 4, 3, 2, 1, 0, 31, 24, 26, 30, 32, 25, 27, 33, 28, 34];
const SPREAD_BITS = [0, 3, 5, 8, 10, 13, 16, 18];

export class LegacyRandom {
  constructor(seed) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new RangeError('随机种子必须是 0 到 4294967295 的整数。');
    }
    this.state = new Uint32Array(624);
    for (let i = 0; i < 624; i++) {
      const upper = seed & 0xffff0000;
      seed = (Math.imul(69069, seed) + 1) >>> 0;
      this.state[i] = upper | (seed >>> 16);
      seed = (Math.imul(69069, seed) + 1) >>> 0;
    }
    this.index = 624;
  }

  uint32() {
    if (this.index === 624) {
      for (let i = 0; i < 624; i++) {
        const y = (this.state[i] & 0x80000000) | (this.state[(i + 1) % 624] & 0x7fffffff);
        this.state[i] = this.state[(i + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let y = this.state[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
}

function normalize(c) {
  if (c === 79) c = 48;
  else if (c > 79) c--;
  c = (c - 48) & 255;
  if (c >= 10 && c <= 127) c = (c - 7) & 255;
  return c;
}

function map35(value) {
  value &= 255;
  value = (value + (value >= 10 ? 7 : 0) + 48) & 255;
  return (value + (value >= 79 ? 1 : 0)) & 255;
}

function map36(value) {
  const c = value + (value >= 10 ? 7 : 0) + 48;
  return c === 79 ? 48 : c;
}

function value36(c) {
  c = (c - 48) & 255;
  return c >= 10 ? (c - 7) & 255 : c;
}

function checksum19(data) {
  let accumulator = 0;
  for (const position of HASH_POSITIONS) {
    const value = normalize(data[position]);
    let spread = 0;
    for (let bit = 0; bit < 8; bit++) {
      if (value & (1 << bit)) spread |= 1 << SPREAD_BITS[bit];
    }
    const high = accumulator & 0x80000000;
    accumulator = ((accumulator << 1) ^ spread) >>> 0;
    if (high) accumulator = (accumulator ^ 0x400007) >>> 0;
  }
  const folded = (((accumulator >>> 5) | accumulator) ^ (accumulator >>> 10)) >>> 0;
  return map35(folded % 35);
}

function checksum6(data) {
  let acc = value36(data[0]);
  for (const [position, weight] of [[1, 2], [2, 3], [3, 4], [4, 5], [12, 7], [13, 5], [14, 13], [15, 3], [16, 11]]) {
    acc += (value36(data[position]) & 63) ^ ((acc * weight) & 63);
  }
  acc = value36(map36(acc % 36));
  for (const [position, weight] of [[10, 7], [9, 3], [8, 5], [7, 11]]) acc += value36(data[position]) * weight;
  data[6] = map36(acc % 36);
}

function setAscii(data, offset, text) {
  data.set(Array.from(text, c => c.charCodeAt(0)), offset);
}

function baseLicense(rng, license, target) {
  const data = new Uint8Array(35);
  setAscii(data, 0, 'KDACRGHIJST'[license] + '126A'[target] + 'DZC');
  rng.uint32(); // 原样本会消耗一次随机数，再将字符固定为 D。
  setAscii(data, 5, '-0');
  for (let pos = 7; pos < 11; pos++) data[pos] = map35(rng.uint32() % 35);
  setAscii(data, 11, '-0010C-');
  const quotient = Math.floor(parseInt(String.fromCharCode(...data.subarray(0, 5)), 36) / (parseInt('0010C', 36) * 7));
  data[12] = map36(((quotient + 0x41c64e6d) >>> 0) % 36);
  data[15] = map36(((data[12] ^ data[1]) + (data[0] ^ data[1]) + data[0] * 4) % 36);
  const initial = [7, 8, 9, 10].map(i => normalize(data[i]));
  for (let attempt = 0; attempt < 35 ** 4; attempt++) {
    const offsets = [Math.floor(attempt / 35 ** 3), Math.floor(attempt / 35 ** 2) % 35, Math.floor(attempt / 35) % 35, attempt % 35];
    for (let i = 0; i < 4; i++) data[7 + i] = map35((initial[i] + offsets[i]) % 35);
    checksum6(data);
    if (checksum19(data) === data[14]) return data;
  }
  throw new Error('本次生成未完成，请重试。');
}

export function validateComputerId(cid) {
  if (typeof cid !== 'string' || cid.length === 0) throw new TypeError('请先填写设备标识（Computer ID）。');
  if (cid.length !== 11 || cid[5] !== '-') throw new RangeError('设备标识应为 11 个字符，第 6 位是连字符，例如 12345-67890。');
  if (!/^[\x20-\x7e]+$/.test(cid)) throw new RangeError('请使用英文字符、数字或半角符号，不支持中文和全角字符。');
  return cid;
}

function choice(value, options, label) {
  if (typeof value === 'string') {
    const index = options.findIndex(option => option.toLowerCase() === value.toLowerCase());
    if (index >= 0) return index;
  } else if (Number.isInteger(value) && value >= 0 && value < options.length) return value;
  throw new RangeError(`请选择有效的${label}。`);
}

function randomSeed() {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器无法初始化生成器，请使用新版浏览器打开网页。');
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}

export class Keygen {
  constructor(seed = randomSeed()) {
    this.rng = new LegacyRandom(seed);
  }

  generate(computerId, licenseType = 0, target = 0) {
    const cid = Uint8Array.from(validateComputerId(computerId), c => c.charCodeAt(0));
    const licenseIndex = choice(licenseType, LICENSE_TYPES, '许可类型');
    const targetIndex = choice(target, TARGETS, '目标平台');
    let carry = normalize(cid[7]);
    for (const pos of [9, 1, 3, 2, 4, 6, 8, 10]) {
      const value = normalize(cid[pos]);
      let transformed = ((value < 32 ? value ^ 26 : value) - carry) & 255;
      if (transformed > 127) transformed = (transformed + 35) & 255;
      cid[pos] = map35(transformed);
      carry = (value + 3) % 35;
    }
    const data = baseLicense(this.rng, licenseIndex, targetIndex);
    data.set([1, 2, 3, 4, 6].map(pos => cid[pos]), 18);
    setAscii(data, 24, '00000-');
    for (const pos of [30, 32, 33, 34]) data[pos] = map36(this.rng.uint32() % 35);
    data[31] = 48;
    data[14] = checksum19(data);
    const total = SUM_POSITIONS.reduce((sum, pos) => sum + normalize(data[pos]), 0) % 1225;
    data[24] = map35(Math.floor(total / 35));
    data[31] = map35(total % 35);
    carry = normalize(data[14]);
    for (const pos of ENCODE_POSITIONS) {
      let value = (normalize(data[pos]) + carry) & 255;
      if (value >= 35) value = (value - 35) & 255;
      if (value < 32) value ^= 26;
      data[pos] = map35(value);
      carry = (value + 3) % 35;
    }
    for (const pos of [5, 11, 17, 23, 29]) data[pos] = 45;
    return String.fromCharCode(...data);
  }
}

export function generateSerial(cid, licenseType = 0, target = 0, seed) {
  return new Keygen(seed).generate(cid, licenseType, target);
}
