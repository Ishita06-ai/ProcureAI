// Executor tests use registerTool() to inject fake, in-memory tools — no DB,
// no mocking library needed. This is exactly the isolation the executor is
// supposed to guarantee: one tool's failure never breaks another's result.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execute } from './executor.js';
import { registerTool, _resetToolRegistry } from './toolRegistry.js';

describe('executor.execute', () => {
  beforeEach(() => {
    _resetToolRegistry();
    registerTool({
      name: 'ok-tool',
      description: 'always succeeds',
      execute: async (input) => ({ echoed: input }),
    });
    registerTool({
      name: 'broken-tool',
      description: 'always throws',
      execute: async () => {
        throw new Error('boom');
      },
    });
  });

  test('returns tool + description + data for a successful call', async () => {
    const results = await execute([{ tool: 'ok-tool', input: { a: 1 } }]);
    assert.equal(results.length, 1);
    assert.equal(results[0].tool, 'ok-tool');
    assert.equal(results[0].description, 'always succeeds');
    assert.deepEqual(results[0].data, { echoed: { a: 1 } });
    assert.equal(results[0].error, undefined);
  });

  test('isolates a failing tool — error is captured, not thrown', async () => {
    const results = await execute([{ tool: 'broken-tool', input: {} }]);
    assert.equal(results[0].data, null);
    assert.equal(results[0].error, 'boom');
  });

  test('one failing tool does not affect a sibling successful tool', async () => {
    const results = await execute([
      { tool: 'broken-tool', input: {} },
      { tool: 'ok-tool', input: { b: 2 } },
    ]);
    const broken = results.find((r) => r.tool === 'broken-tool');
    const ok = results.find((r) => r.tool === 'ok-tool');
    assert.equal(broken.error, 'boom');
    assert.deepEqual(ok.data, { echoed: { b: 2 } });
  });

  test('an unregistered tool name produces a graceful "not registered" result', async () => {
    const results = await execute([{ tool: 'nonexistent', input: {} }]);
    assert.equal(results[0].data, null);
    assert.equal(results[0].error, 'Tool not registered');
  });

  test('context is merged as defaults into every tool input', async () => {
    const results = await execute([{ tool: 'ok-tool', input: { a: 1 } }], { userId: 'u1' });
    assert.deepEqual(results[0].data.echoed, { userId: 'u1', a: 1 });
  });

  test('explicit step input overrides shared context on key collision', async () => {
    const results = await execute([{ tool: 'ok-tool', input: { userId: 'explicit' } }], { userId: 'from-context' });
    assert.equal(results[0].data.echoed.userId, 'explicit');
  });
});