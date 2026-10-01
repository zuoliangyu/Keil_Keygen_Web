import { Keygen } from './core.mjs';

// 每个页面会话复用同一随机流。耗时计算独立于页面输入、滚动和复制。
let engine;
self.addEventListener('message', ({ data }) => {
  if (data?.type !== 'generate') return;
  try {
    engine ??= new Keygen();
    const serial = engine.generate(data.cid, data.license, data.target);
    self.postMessage({ type: 'result', id: data.id, serial });
  } catch (error) {
    self.postMessage({ type: 'failure', id: data.id, message: error.message });
  }
});
self.postMessage({ type: 'ready' });
