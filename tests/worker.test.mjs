import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';

test('Worker 真正执行生成、返回失败并可继续生成', { timeout: 8000 }, async () => {
  const worker = new Worker(new URL('./worker-adapter.mjs', import.meta.url));
  try {
    const [ready] = await once(worker, 'message');
    assert.equal(ready.type, 'ready');
    const first = once(worker, 'message');
    worker.postMessage({ type: 'generate', id: 1, cid: '12345-67890', license: 0, target: 'C51' });
    const [result] = await first;
    assert.equal(result.type, 'result');
    assert.equal(result.id, 1);
    assert.match(result.serial, /^[0-9A-Z]{5}(?:-[0-9A-Z]{5}){5}$/);
    const rejected = once(worker, 'message');
    worker.postMessage({ type: 'generate', id: 2, cid: 'bad', license: 0, target: 'C51' });
    assert.equal((await rejected)[0].type, 'failure');
    const next = once(worker, 'message');
    worker.postMessage({ type: 'generate', id: 3, cid: 'ABCDE-FGHIJ', license: 10, target: 'ARM' });
    const [again] = await next;
    assert.equal(again.type, 'result');
    assert.equal(again.id, 3);
    assert.equal(again.serial.length, 35);
  } finally {
    await worker.terminate();
  }
});
