import { LICENSE_TYPES } from './core.mjs';
import { createSession } from './session.mjs';

const LICENSE_LABELS = [
  '专业开发套件（Plus）', '开发套件', '宏汇编工具包', '编译器 / 汇编器工具包',
  '实时操作系统', '调试器', 'Hitex 扩展', 'Infineon 扩展',
  'Cortex-M 标准版', 'Cortex-M 专业版', '专业版',
];
const byId = id => document.getElementById(id);
const form = byId('generator-form');
const cid = byId('cid');
const license = byId('license');
const generate = byId('generate-button');
const copy = byId('copy-button');
const output = byId('serial-output');
const clear = byId('clear-button');
let view;
let copyAttempt = 0;
let toastTimer;

LICENSE_LABELS.forEach((label, index) => {
  const option = new Option(label, String(index));
  option.title = LICENSE_TYPES[index];
  if (index === 0) license.replaceChildren(option);
  else license.append(option);
});
license.disabled = false;

function toast(message) {
  clearTimeout(toastTimer);
  const element = byId('toast');
  element.textContent = message;
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, 3500);
}

function render(state) {
  const previous = view;
  view = state;
  copyAttempt++;
  clearTimeout(toastTimer);
  byId('toast').hidden = true;
  const busy = state.phase === 'pending';
  const hasResult = Boolean(state.serial);
  generate.disabled = ['loading', 'pending', 'unavailable'].includes(state.phase);
  generate.dataset.busy = String(busy);
  byId('generate-label').textContent = busy ? '正在生成…' : state.phase === 'loading' ? '正在准备…' : state.phase === 'unavailable' ? '请刷新页面重试' : hasResult ? '重新生成' : '生成序列号';
  clear.disabled = cid.value.length === 0;
  byId('cid-count').textContent = `${Array.from(cid.value).length} / 11`;
  cid.setAttribute('aria-invalid', String(state.fieldError));
  byId('form-error').textContent = state.error;
  byId('license-detail').textContent = LICENSE_TYPES[state.license];
  license.title = LICENSE_TYPES[state.license];
  byId('result-card').setAttribute('aria-busy', String(busy));
  byId('result-status-text').textContent = busy ? '生成中' : hasResult ? '已生成' : '待生成';
  byId('result-title').textContent = busy ? '正在生成序列号' : hasResult ? '序列号已生成' : '序列号将在这里显示';
  byId('result-context').textContent = hasResult
    ? `${state.target} · ${LICENSE_LABELS[state.license]}`
    : busy ? '正在处理当前配置，请稍候。' : '填写设备信息后，点击生成。';
  byId('result-note').textContent = hasResult ? '复制时会包含全部字符和连字符。' : '生成后可复制完整序列号。';
  output.classList.toggle('is-empty', !hasResult);
  output.setAttribute('aria-label', hasResult ? `序列号：${state.serial}` : '尚未生成序列号');
  const groups = [];
  for (let index = 0; index < 6; index++) {
    const group = document.createElement('span');
    group.className = 'code-group';
    group.textContent = hasResult ? state.serial.slice(index * 6, index * 6 + 5) : '·····';
    if (hasResult && index < 5) {
      const separator = document.createElement('span');
      separator.className = 'sr-only';
      separator.textContent = '-';
      group.append(separator);
    }
    groups.push(group);
  }
  output.replaceChildren(...groups);
  copy.disabled = !hasResult;
  byId('copy-label').textContent = '复制序列号';
  byId('manual-copy').hidden = true;
  byId('manual-serial').value = '';
  if (state.phase === 'ready' && previous?.phase !== 'ready') {
    byId('announcement').textContent = '序列号已生成，可以复制。';
  } else if (busy && previous?.phase !== 'pending') {
    byId('announcement').textContent = '正在生成序列号。';
  } else if (previous?.serial && !hasResult) {
    byId('announcement').textContent = '配置已变更，旧结果已清空，请重新生成。';
  }
}

let session;
try {
  if (!globalThis.Worker) throw new Error('Worker unavailable');
  const worker = new Worker(new URL('./generator.worker.mjs', import.meta.url), { type: 'module' });
  session = createSession(worker, render);
  // 浏览器可能在后退或刷新时恢复表单，启动时以实际控件值为准。
  session.update({ cid: cid.value, target: form.elements.target.value, license: Number(license.value) });
} catch {
  render({ cid: cid.value, target: 'C51', license: 0, serial: '', phase: 'unavailable', fieldError: false,
    error: '无法启动生成器。请使用新版浏览器，通过网页地址打开此页面。' });
}

cid.addEventListener('input', () => session?.update({ cid: cid.value }));
form.addEventListener('change', event => {
  if (event.target.name === 'target') session?.update({ target: event.target.value });
  if (event.target === license) session?.update({ license: Number(license.value) });
});
clear.addEventListener('click', () => {
  cid.value = '';
  session?.update({ cid: '' });
  cid.focus();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!session) return;
  // 同步自动填充或脚本更改后尚未触发 change 的实际控件值。
  session.update({ cid: cid.value, target: form.elements.target.value, license: Number(license.value) });
  session.generate();
  if (session.snapshot().fieldError) cid.focus();
});
copy.addEventListener('click', async () => {
  if (!view?.serial) return;
  const serial = view.serial;
  const attempt = ++copyAttempt;
  copy.disabled = true;
  byId('copy-label').textContent = '正在复制…';
  try {
    await navigator.clipboard.writeText(serial);
    if (attempt !== copyAttempt) return;
    byId('copy-label').textContent = '已复制';
    toast('序列号已复制，可以粘贴使用。');
  } catch {
    if (attempt !== copyAttempt) return;
    byId('manual-copy').hidden = false;
    const fallback = byId('manual-serial');
    fallback.value = serial;
    fallback.focus();
    fallback.select();
    fallback.setSelectionRange(0, serial.length);
    byId('copy-label').textContent = '复制序列号';
    toast('浏览器未允许自动复制，请复制下方已选中的文本。');
  } finally {
    if (attempt === copyAttempt) copy.disabled = false;
  }
});
