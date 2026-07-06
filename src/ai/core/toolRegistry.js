// ToolRegistry — discovers every *.tool.js file in ../tools at first use and
// exposes them by name. To add a new tool: drop a file in tools/ that default-
// exports { name, description, execute() } — no other wiring is required.
//
// Implementation note: the dynamic import below uses a template literal
// (`../tools/${file}`). Webpack (which Next.js uses to bundle server code)
// recognises this "partial dynamic import" pattern and bundles every file
// under src/ai/tools/ automatically, so this works the same in `next dev`
// and in a production build — it is not relying on filesystem access at
// runtime for anything other than listing filenames.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR = path.join(__dirname, '..', 'tools');

const registry = new Map();
let loaded = false;

function isValidTool(mod) {
  const tool = mod?.default ?? mod;
  return !!(
    tool &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.execute === 'function'
  );
}

async function loadTools() {
  if (loaded) return;
  loaded = true;

  let files = [];
  try {
    files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.tool.js'));
  } catch (err) {
    logger.error('toolRegistry.scan_failed', { dir: TOOLS_DIR, err: err.message });
    return;
  }

  for (const file of files) {
    try {
      const mod = await import(`../tools/${file}`);
      const tool = mod?.default ?? mod;
      if (!isValidTool(tool)) {
        logger.warn('toolRegistry.invalid_tool_skipped', { file });
        continue;
      }
      if (registry.has(tool.name)) {
        logger.warn('toolRegistry.duplicate_tool_name', { name: tool.name, file });
      }
      registry.set(tool.name, tool);
      logger.info('toolRegistry.tool_registered', { name: tool.name, file });
    } catch (err) {
      logger.error('toolRegistry.load_failed', { file, err: err.message });
    }
  }
}

/** Manually register a tool (useful for tests or dynamically built tools). */
export function registerTool(tool) {
  if (!isValidTool(tool)) throw new Error('Tool must export { name, description, execute() }');
  registry.set(tool.name, tool);
}

/** Get a single tool by name. Triggers discovery on first call. */
export async function getTool(name) {
  await loadTools();
  return registry.get(name) || null;
}

/** Get every registered tool — used by the planner to know what's available. */
export async function getAllTools() {
  await loadTools();
  return [...registry.values()];
}

/** Test/dev helper to force a re-scan (e.g. after adding a tool in a hot-reload session). */
export function _resetToolRegistry() {
  registry.clear();
  loaded = false;
}