import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../site/session.mjs';

class WorkerDouble extends EventTarget {
  sent = [];
  postMessage(data) { this.sent.push(data); }
  reply(data) { this.dispatchEvent(new MessageEvent('message', { data })); }
  terminate() { this.terminated = true; }
}
function setup() {
  const worker = new WorkerDouble();
  const states = [];
  const session = createSession(worker, state => states.push(state));
  worker.reply({ type: 'ready' });
  return { worker, session, states };
}

test('非法 CID 不提交计算；正确结果可用，修改任意参数立即清空', () => {
  for (const change of [{ cid: 'ABCDE-FGHIJ' }, { target: 'ARM' }, { license: 10 }]) {
    const { worker, session } = setup();
    assert.equal(session.generate(), false);
    assert.equal(session.snapshot().fieldError, true);
    assert.equal(worker.sent.length, 0);
    session.update({ cid: '12345-67890' });
    assert.equal(session.generate(), true);
    worker.reply({ type: 'result', id: worker.sent[0].id, serial: 'a result' });
    assert.equal(session.snapshot().phase, 'ready');
    session.update(change);
    assert.equal(session.snapshot().serial, '');
    assert.equal(session.snapshot().phase, 'idle');
  }
});

test('输入更新后丢弃旧参数的延迟结果，下一次请求仍正常完成', () => {
  const { worker, session } = setup();
  session.update({ cid: '12345-67890' });
  session.generate();
  session.update({ target: 'ARM' });
  worker.reply({ type: 'result', id: worker.sent[0].id, serial: 'stale' });
  assert.equal(session.snapshot().serial, '');
  assert.equal(session.snapshot().phase, 'idle');
  session.generate();
  assert.equal(worker.sent[1].target, 'ARM');
  worker.reply({ type: 'result', id: worker.sent[1].id, serial: 'current' });
  assert.equal(session.snapshot().serial, 'current');
});

test('同一配置不误清空结果；重复提交不发送额外请求', () => {
  const { worker, session } = setup();
  session.update({ cid: '12345-67890' });
  session.generate();
  session.update({ cid: '12345-67890', target: 'C51', license: 0 });
  assert.equal(session.generate(), false);
  assert.equal(worker.sent.length, 1);
  worker.reply({ type: 'result', id: worker.sent[0].id, serial: 'current' });
  session.update({ cid: '12345-67890' });
  assert.equal(session.snapshot().serial, 'current');
});

test('计算失败允许重试，Worker 加载失败显示错误且清空旧结果', () => {
  const { worker, session } = setup();
  session.update({ cid: '12345-67890' });
  session.generate();
  worker.reply({ type: 'failure', id: worker.sent[0].id, message: '计算失败' });
  assert.equal(session.snapshot().error, '计算失败');
  assert.equal(session.generate(), true);
  worker.reply({ type: 'result', id: worker.sent[1].id, serial: 'current' });
  worker.dispatchEvent(new Event('error'));
  assert.equal(session.snapshot().phase, 'unavailable');
  assert.equal(session.snapshot().serial, '');
  session.update({ target: 'ARM' });
  assert.match(session.snapshot().error, /加载失败/);
  assert.equal(session.generate(), false);
});

test('加载前不发送请求，销毁会话后停止更新', () => {
  const worker = new WorkerDouble();
  const states = [];
  const session = createSession(worker, state => states.push(state));
  assert.equal(session.generate(), false);
  session.dispose();
  const count = states.length;
  worker.reply({ type: 'ready' });
  session.update({ cid: '12345-67890' });
  assert.equal(session.generate(), false);
  assert.equal(worker.terminated, true);
  assert.equal(states.length, count);
});
