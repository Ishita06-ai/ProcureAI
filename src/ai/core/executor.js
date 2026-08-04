// Executor — runs a plan (a list of {tool, input} steps) against the
// ToolRegistry. Every tool call is isolated: one failing tool never breaks
// the others or the overall agent response.
import { getTool } from './toolRegistry.js';
import { logger } from '../utils/logger.js';

/**
 * @param {{tool: string, input: object}[]} planSteps
 * @param {object} [context] - shared, request-scoped data (e.g. { userId })
 *   merged into every tool's input as defaults. Explicit values in a step's
 *   own `input` always win over `context`.
 * @returns {Promise<{tool: string, description: string|null, data: any, error?: string}[]>}
 */
export async function execute(planSteps = [], context = {}) {
  const results = await Promise.all(
    planSteps.map(async (step) => {
      const tool = await getTool(step.tool);
      if (!tool) {
        logger.warn('executor.tool_not_found', { tool: step.tool });
        return { tool: step.tool, description: null, data: null, error: 'Tool not registered' };
      }
      try {
        const input = { ...context, ...(step.input || {}) };
        console.log('TOOL NAME =', tool.name);
        console.log('TOOL INPUT =', JSON.stringify(input, null, 2));
        const data = await tool.execute(input);
        console.log('TOOL OUTPUT =', JSON.stringify(data, null, 2));
        return { tool: tool.name, description: tool.description, data };
      } catch (err) {
        logger.error('executor.tool_failed', { tool: tool.name, err: err.message });
        return { tool: tool.name, description: tool.description, data: null, error: err.message };
      }
    })
  );
  console.log('TOOL RESULTS =', JSON.stringify(results, null, 2));
  return results;
}

export default { execute };