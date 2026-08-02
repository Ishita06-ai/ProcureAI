# Agentic AI — Architecture (multi-agent)

This is the AI Assistant's brain. Everything here is plain JavaScript (no
TypeScript), reuses the project's existing MongoDB services, and never touches
React components or API routes directly.

## Request lifecycle (supervisor → worker → supervisor)

```
User message
   │
   ▼
server/controllers/ai.controller.js   (HTTP only — no AI logic)
   │
   ▼
src/ai/services/ai.service.js         (conversation persistence adapter)
   │
   ▼
src/ai/core/agent.js                  runAgent = runSupervisor (stable entry point)
   │
   ▼
src/ai/agents/supervisor.js           runSupervisor({ message, history, actor })
   │
   │  1. ROUTE  ──► agents/router.js
   │                 LLM asks the model to pick an agent → validates reply;
   │                 keyword fallback reuses planner.js intent detection.
   │                 │  specialist chosen                 │  none fits
   │                 ▼                                   ▼
   │  2. WORKER  agents/specialist.js          GENERALIST path:
   │     specialist runs within ITS OWN        run all tools directly
   │     tool subset (agents/specialists.js)   (planner → executor → prompt)
   │     + reasons with its own role prompt
   │                 │
   │                 ▼  structured findings + citations
   │  3. SYNTHESIZE  supervisor writes the final answer from the
   │                 specialist's findings (prompts/supervisor.prompt.js)
   │                 ▼
   └─► services/gemini.service.js   generateReply({ systemPrompt, messages })
           │ (falls back to a structured data summary if this throws)
           ▼
   { content, citations, toolResults, provider, usedFallback }
```

Each turn is a genuine handoff loop: the **Supervisor** decides which specialist
handles the message, the **specialist** runs (its own tools + its own LLM
persona), and the **Supervisor** synthesizes the final answer. Specialist
citations ride through so the UI popovers keep working.

## Folder responsibilities

| Path | Responsibility |
|---|---|
| `core/agent.js` | Public entry point (`runAgent`). Thin facade over the supervisor. |
| `agents/supervisor.js` | Coordinator: routes → dispatches specialist → synthesizes. Generalist path when no specialist fits. |
| `agents/router.js` | Routing: LLM picks an agent, keyword fallback reuses the planner. Pure `routeByKeywords`/`parseRouterResponse` for tests. |
| `agents/specialists.js` | The worker agents (Procurement Analyst, Inventory Agent, Vendor Risk Analyst): each `{ name, description, tools[], systemPrompt }`. |
| `agents/specialist.js` | Runs one specialist: plans within its tool subset → executes → reasons with its role prompt. |
| `core/planner.js` | Pure function: message → list of `{tool, input}` steps. Also `hasIntent()` (real intent vs vague fallback). No I/O. |
| `core/executor.js` | Runs a plan against the registry. Isolates per-tool failures. |
| `core/toolRegistry.js` | Auto-discovers `tools/*.tool.js` via a webpack-safe dynamic import. |
| `core/toolResult.js` | Shared "is this result safe to show the user/LLM" filter. |
| `core/format.js` | Shared citations + structured-fallback builders for all agents. |
| `tools/*.tool.js` | One file per domain (inventory, vendor, analytics, notification, purchase orders). Read-only, delegate to existing `server/services/*`. |
| `prompts/supervisor.prompt.js` | Generalist persona, specialist-handoff synthesis prompt, and grounded tool serialization. |
| `services/gemini.service.js` | The only file that talks to an LLM provider. |
| `utils/logger.js` | Re-exports the project's existing logger with `{ scope: 'ai' }`. |

## The tool contract

Every tool default-exports:

```js
export default {
  name: 'inventory',
  description: 'What this tool provides, in one sentence.',
  async execute(input) {
    // ...
    return { success: true, action: 'low_stock', data: [...] };
    // or, on a handled error:
    return { success: false, action: 'low_stock', error: 'message' };
  },
};
```

Tools **never throw** for expected failures (not found, bad input) — they
return `success:false` instead. `toolResult.isGrounded()` checks both this
flag *and* executor-level failures before anything reaches the LLM or the
UI, so a failed lookup can never be mistaken for real data.

Tools **never call the LLM**. They only fetch and shape data — presentation
is the Agent's job, not the tool's.

## Adding a new tool

1. Create `src/ai/tools/whatever.tool.js` exporting `{name, description, execute}`.
2. Delegate to an existing `server/services/*` — add a method there first if
   the data access doesn't exist yet, rather than querying Mongo from the tool.
3. That's it — `toolRegistry.js` picks it up automatically. To make the
   planner actually route messages to it, add a keyword group in `planner.js`
   (e.g. `{ tool: 'po', keywords: ['purchase order', 'delivery', ...] }`).
4. To let a specialist call it, add the tool name to that agent's `tools` list
   in `agents/specialists.js`; the keyword router scores specialists by how many
   of the planned tools they own.

## Adding a new specialist agent

Create an entry in `agents/specialists.js` with `{ name, description, tools,
systemPrompt }`. `description` is what the LLM supervisor reads to route to it;
`tools` caps what it may call; `systemPrompt` is its role. No other wiring.

## Why a keyword planner/router fallback instead of pure LLM routing

Routing a message to an agent is LLM-driven when a provider is available, but
the fallback is deterministic, free, and unit-tested (`router.test.js`): the
planner's intent detection picks the tools a message triggers, and each
specialist scores by how many of those tools it owns (ties go to the first in
the list). Vague questions hit the planner's `analytics + inventory` default —
those route to the generalist, not a specialist. Same trade-off as before:
fast and never blocked by an LLM provider outage.

## Testing

No test framework was added — everything runs on Node's built-in `node:test`.

```
npm run test
```

- `planner.test.js`, `executor.test.js`, `toolResult.test.js` — pure logic, no DB, no flags.
- `agents/router.test.js` — pure `routeByKeywords` / `parseRouterResponse` routing.
- `agents/specialist.test.js` — a specialist runs only within its own tool subset.
- `agents/supervisor.test.js` — the full handoff (route → specialist → synthesize)
  and the generalist path, with the LLM + data services stubbed via `mock.module`.
- `toolRegistry.test.js` — includes a live discovery test against the real `tools/` folder.
- `*.tool.test.js` — stub the service layer with `node:test`'s built-in ESM
  mocking (`mock.module`), which requires Node ≥22.3 and the
  `--experimental-test-module-mocks` flag (already in the `test` script).

## Known trade-offs (worth knowing for a walkthrough)

- **Multi-agent costs more LLM calls.** A specialist turn uses two (router +
  synthesis) plus one per specialist — so up to three per message with a real
  provider. The keyword router and mock provider keep it fully testable and
  graceful when the LLM is down.
- **Router is keyword-fallback, not pure LLM.** LLM routing wins when a
  provider is configured; otherwise deterministic planner-based scoring, which
  won't handle novel phrasing outside the keyword list — vague questions fall
  back to the generalist rather than guessing wrong.
- **Tool results are capped in citations** (`core/format.js`'s `previewData`,
  1200 chars) since citations get persisted per chat message in MongoDB —
  intentional trade-off between transparency and document size.
- **`userId` is the only context threaded through today** (for personalizing
  notifications). Extending `executor.execute(planSteps, context)`'s second
  argument is the place to add more (e.g. `role` for permission-aware tools).