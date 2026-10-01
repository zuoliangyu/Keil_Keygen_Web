import { validateComputerId } from './core.mjs';

/** 独立于 DOM 的会话：参数变化清空结果，并丢弃旧参数的延迟响应。 */
export function createSession(worker, onChange) {
  let revision = 0;
  let nextId = 0;
  let pending = null;
  let disposed = false;
  const state = { cid: '', license: 0, target: 'C51', phase: 'loading', serial: '', error: '', fieldError: false };
  const snapshot = () => ({ ...state });
  const emit = () => { if (!disposed) onChange(snapshot()); };
  function fail() {
    pending = null;
    state.phase = 'unavailable';
    state.serial = '';
    state.fieldError = false;
    state.error = '生成器加载失败，请刷新页面重试。';
    emit();
  }
  function onMessage({ data }) {
    if (disposed) return;
    if (data?.type === 'ready' && state.phase === 'loading') {
      state.phase = 'idle';
      emit();
      return;
    }
    if (!pending || data?.id !== pending.id || !['result', 'failure'].includes(data.type)) return;
    const current = pending.revision === revision;
    pending = null;
    state.phase = 'idle';
    if (current) {
      if (data.type === 'result') {
        state.serial = data.serial;
        state.phase = 'ready';
      } else {
        state.error = data.message || '本次生成未完成，请重试。';
      }
    }
    emit();
  }
  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', fail);
  worker.addEventListener('messageerror', fail);
  emit();
  return {
    snapshot,
    update(values) {
      if (disposed) return;
      if (!['cid', 'license', 'target'].some(key => Object.hasOwn(values, key) && values[key] !== state[key])) return;
      for (const key of ['cid', 'license', 'target']) if (Object.hasOwn(values, key)) state[key] = values[key];
      revision++;
      state.serial = '';
      if (state.phase !== 'unavailable') state.error = '';
      state.fieldError = false;
      if (state.phase === 'ready') state.phase = 'idle';
      emit();
    },
    generate() {
      if (disposed || ['loading', 'pending', 'unavailable'].includes(state.phase)) return false;
      state.serial = '';
      state.error = '';
      state.fieldError = false;
      try {
        validateComputerId(state.cid);
      } catch (error) {
        state.phase = 'idle';
        state.error = error.message;
        state.fieldError = true;
        emit();
        return false;
      }
      pending = { id: ++nextId, revision };
      state.phase = 'pending';
      emit();
      try {
        worker.postMessage({ type: 'generate', id: pending.id, cid: state.cid, license: state.license, target: state.target });
      } catch { fail(); }
      return state.phase === 'pending';
    },
    dispose() {
      disposed = true;
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', fail);
      worker.removeEventListener('messageerror', fail);
      worker.terminate();
    },
  };
}
