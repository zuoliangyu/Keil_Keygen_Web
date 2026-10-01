// 仅在 Node 局部验证中适配 Web Worker 消息接口，不发布到站点。
import { parentPort } from 'node:worker_threads';
globalThis.self = {
  addEventListener(type, callback) {
    if (type === 'message') parentPort.on('message', data => callback({ data }));
  },
  postMessage(data) { parentPort.postMessage(data); },
};
await import('../site/generator.worker.mjs');
