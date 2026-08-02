// Agent — the public entry point for the AI Assistant (now multi-agent).
//
// Orchestration lives in agents/supervisor.js: the Supervisor routes to a
// specialist agent, the specialist runs within its own tool subset + role
// prompt, and the Supervisor synthesizes the final answer (a handoff loop of
// supervisor → worker → supervisor). If no specialist fits, the Supervisor
// handles the turn directly as a generalist over all tools.
// This file keeps the public runAgent() signature stable so the adapter
// (src/ai/services/ai.service.js) and the HTTP layer need zero changes.
import { runSupervisor } from '../agents/supervisor.js';

export const runAgent = runSupervisor;
export default { runAgent };
