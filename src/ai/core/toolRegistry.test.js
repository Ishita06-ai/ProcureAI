// toolRegistry tests. The registerTool/getTool/getAllTools path needs no
// mocking. The "real discovery" test at the bottom exercises the actual
// fs + dynamic-import scan against src/ai/tools/*.tool.js — it requires
// node_modules to be installed (the tool files import real services/models),
// so skip it in environments without deps via `node --test --test-skip-pattern`
// or just `npm install` first.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerTool, getTool, getAllTools, _resetToolRegistry } from './toolRegistry.js';

describe('toolRegistry — manual registration', () => {
  beforeEach(() => {
    _resetToolRegistry();
  });

  test('registerTool + getTool round-trips a valid tool', async () => {
    registerTool({ name: 'fake', description: 'a fake tool', execute: async () => ({}) });
    const tool = await getTool('fake');
    assert.equal(tool.name, 'fake');
  });

  test('getTool returns null for an unregistered name', async () => {
    // Note: getTool() triggers the real fs-based auto-discovery on first
    // call if nothing has loaded yet, so registeredTool a throwaway tool
    // first to keep this test isolated from the real tools/ directory.
    registerTool({ name: 'placeholder', description: 'x', execute: async () => ({}) });
    const tool = await getTool('definitely-not-registered');
    assert.equal(tool, null);
  });

  test('registerTool rejects a tool missing required fields', () => {
    assert.throws(() => registerTool({ name: 'bad' }), /must export/i);
    assert.throws(() => registerTool({ description: 'bad' }), /must export/i);
    assert.throws(() => registerTool({ name: 'bad', description: 'bad' }), /must export/i);
  });

  test('getAllTools includes manually registered tools alongside auto-discovered ones', async () => {
    // _resetToolRegistry() clears the map, but getAllTools() still re-triggers
    // the real fs-based discovery of src/ai/tools/*.tool.js — that's by
    // design (production always wants discovery). So we assert our tools
    // are present, not that they're the *only* tools.
    registerTool({ name: 'a', description: 'x', execute: async () => {} });
    registerTool({ name: 'b', description: 'y', execute: async () => {} });
    const tools = await getAllTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes('a'));
    assert.ok(names.includes('b'));
  });
});

describe('toolRegistry — real auto-discovery (requires node_modules)', () => {
  beforeEach(() => {
    _resetToolRegistry();
  });

  test('discovers every *.tool.js file under src/ai/tools/', async () => {
    const tools = await getAllTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['analytics', 'inventory', 'notification', 'vendor']);
  });

  test('every discovered tool satisfies the {name, description, execute} contract', async () => {
    const tools = await getAllTools();
    for (const tool of tools) {
      assert.equal(typeof tool.name, 'string');
      assert.equal(typeof tool.description, 'string');
      assert.equal(typeof tool.execute, 'function');
    }
  });
});