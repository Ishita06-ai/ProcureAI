// Executor — runs a plan (a list of {tool, input} steps) against the
// ToolRegistry. Every tool call is isolated: one failing tool never breaks
// the others or the overall agent response.
import { getTool } from './toolRegistry.js';
import { logger } from '../utils/logger.js';

/**
 * @param {{tool: string, input: object}[]} planSteps
 * @returns {Promise<{tool: string, description: string|null, data: any, error?: string}[]>}
 */
export async function execute(planSteps = []) {
  const results = await Promise.all(
    planSteps.map(async (step) => {
      const tool = await getTool(step.tool);
      if (!tool) {
        logger.warn('executor.tool_not_found', { tool: step.tool });
        return { tool: step.tool, description: null, data: null, error: 'Tool not registered' };
      }
      try {
        const data = await tool.execute(step.input || {});
        return { tool: tool.name, description: tool.description, data };
      } catch (err) {
        logger.error('executor.tool_failed', { tool: tool.name, err: err.message });
        return { tool: tool.name, description: tool.description, data: null, error: err.message };
      }
    })
  );
  return results;
}

export default { execute };