// ToolRegistry — exposes every tool by name for the planner and executor.
//
// Vercel/serverless-safe: every tool is STATICALLY imported at module load and
// registered into an in-memory Map. There is no filesystem access — no
// fs.readdirSync, no TOOLS_DIR, no import.meta.url path discovery. The old
// dynamic directory scan broke on Vercel because src/ai/tools/*.tool.js is not
// present as a real directory in the serverless bundle (webpack bakes the
// build-machine path into import.meta.url), so getTool() returned null and the
// executor recorded "Tool not registered" for every step.
//
// To add a new tool: drop a file in ../tools that default-exports
// { name, description, execute() }, then add it to TOOL_MODULES below. No other
// wiring is required.
import analyticsTool from '../tools/analytics.tool.js';
import inventoryTool from '../tools/inventory.tool.js';
import notificationTool from '../tools/notification.tool.js';
import poTool from '../tools/po.tool.js';
import vendorTool from '../tools/vendor.tool.js';
import { logger } from '../utils/logger.js';

// The complete, statically-known tool set. Order here is registration order.
const TOOL_MODULES = [analyticsTool, inventoryTool, notificationTool, poTool, vendorTool];

const registry = new Map();
let loaded = false;

function isValidTool(tool) {
  return !!(
    tool &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.execute === 'function'
  );
}

// Register one tool module into the registry, preserving duplicate-name
// detection (a later duplicate warns and overwrites, matching the old scan).
function registerModule(mod) {
  const tool = mod?.default ?? mod;
  if (!isValidTool(tool)) {
    logger.warn('toolRegistry.invalid_tool_skipped', { file: 'static import' });
    return;
  }
  if (registry.has(tool.name)) {
    logger.warn('toolRegistry.duplicate_tool_name', { name: tool.name, file: 'static import' });
  }
  registry.set(tool.name, tool);
  logger.info('toolRegistry.tool_registered', { name: tool.name, file: 'static import' });
}

// Register every statically imported tool at module initialization — no
// filesystem scan, so this behaves identically on localhost and Vercel.
for (const mod of TOOL_MODULES) registerModule(mod);

// Kept for API/behaviour compatibility: after _resetToolRegistry() clears the
// Map, the next getTool()/getAllTools() call re-registers the static tool set.
async function loadTools() {
  if (loaded) return;
  loaded = true;
  for (const mod of TOOL_MODULES) {
    const tool = mod?.default ?? mod;
    // Skip tools already present so the post-init first call is a no-op
    // (avoids a spurious duplicate warning).
    if (tool && typeof tool.name === 'string' && !registry.has(tool.name)) registerModule(mod);
  }
}

/** Manually register a tool (useful for tests or dynamically built tools). */
export function registerTool(tool) {
  if (!isValidTool(tool)) throw new Error('Tool must export { name, description, execute() }');
  registry.set(tool.name, tool);
}

/** Get a single tool by name. */
export async function getTool(name) {
  await loadTools();
  return registry.get(name) || null;
}

/** Get every registered tool — used by the planner to know what's available. */
export async function getAllTools() {
  await loadTools();
  return [...registry.values()];
}

/** Test/dev helper to clear the registry; the static tools are re-registered on next use. */
export function _resetToolRegistry() {
  registry.clear();
  loaded = false;
}

console.log('REGISTERED TOOLS =', [...registry.keys()]);
