// Router tests. routeByKeywords and parseRouterResponse are pure functions —
// no mocking needed. routeToSpecialist's LLM path is covered by
// supervisor.test.js (which mocks generateReply) and the live E2E check.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { routeByKeywords, parseRouterResponse } from './router.js';
import { specialists } from './specialists.js';

describe('router — keyword routing (deterministic fallback)', () => {
  test('vendor risk question → vendor-risk-agent', () => {
    assert.equal(routeByKeywords('which vendors are at risk?', specialists), 'vendor-risk-agent');
  });

  test('low stock question → inventory-agent', () => {
    assert.equal(routeByKeywords('show me low stock items', specialists), 'inventory-agent');
  });

  test('spend question → procurement-analyst', () => {
    assert.equal(routeByKeywords('how is spend by category?', specialists), 'procurement-analyst');
  });

  test('purchase order question → procurement-analyst', () => {
    assert.equal(routeByKeywords('what purchase orders are in transit?', specialists), 'procurement-analyst');
  });

  test('vendor spend ties → vendor-risk-agent wins on score (analytics + vendor)', () => {
    assert.equal(routeByKeywords('which vendors have the highest spend?', specialists), 'vendor-risk-agent');
  });

  test('notification / general question → generalist (null)', () => {
    assert.equal(routeByKeywords('do i have unread notifications?', specialists), null);
    assert.equal(routeByKeywords('how are we doing?', specialists), null);
  });
});

describe('router — LLM response parsing', () => {
  test('parses valid JSON', () => {
    assert.equal(parseRouterResponse('{"specialist":"inventory-agent"}', specialists), 'inventory-agent');
  });

  test('parses an agent name embedded in prose', () => {
    assert.equal(parseRouterResponse('I would route this to vendor-risk-agent for analysis.', specialists), 'vendor-risk-agent');
  });

  test('parses generalist', () => {
    assert.equal(parseRouterResponse('{"specialist":"generalist"}', specialists), 'generalist');
  });

  test('rejects an unknown agent name', () => {
    assert.equal(parseRouterResponse('{"specialist":"bogus-agent"}', specialists), null);
  });

  test('returns null for empty/garbage input', () => {
    assert.equal(parseRouterResponse('', specialists), null);
    assert.equal(parseRouterResponse('not a routing response at all', specialists), null);
  });
});
