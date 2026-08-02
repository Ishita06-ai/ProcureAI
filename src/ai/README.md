# Agentic AI — Architecture

This is the AI Assistant's brain. Everything here is plain JavaScript (no
TypeScript), reuses the project's existing MongoDB services, and never touches
React components or API routes directly.

## Request lifecycle

```
User message
   │
   ▼
server/controllers/ai.controller.js   (HTTP only — no AI logic)
   │
   ▼
server/services/ai.service.js         (conversation persistence adapter)
   │
   ▼
src/ai/core/agent.js                  runAgent({ message, history, actor })
   │
   ├─► planner.js      plan(message) → [{ tool, input }]
   │
   ├─► executor.js     execute(planSteps, { userId }) → toolResults[]
   │       │
   │       └─► toolRegistry.js → tools/*.tool.js (read-only, no LLM calls)
   │
   ├─► toolResult.js   groundedOnly(toolResults) — drops failed/errored results
   │
   ├─► prompts/supervisor.prompt.js   buildSupervisorPrompt(toolResults)
   │
   └─► services/gemini.service.js    generateReply({ systemPrompt, messages })
           │ (falls back to a structured data summary if this throws)
           ▼
   { content, citations, toolResults, provider, usedFallback }
```

## Folder responsibilities

| Path | Responsibility |
|---|---|
| `core/agent.js` | Orchestrator. The only exported entry point (`runAgent`). |
| `core/planner.js` | Pure function: message → list of `{tool, input}` steps. No I/O. |
| `core/executor.js` | Runs a plan against the registry. Isolates per-tool failures. |
| `core/toolRegistry.js` | Auto-discovers `tools/*.tool.js` via a webpack-safe dynamic import. |
| `core/toolResult.js` | Shared "is this result safe to show the user/LLM" filter. |
| `tools/*.tool.js` | One file per domain (inventory, vendor, analytics, notification, purchase orders). Read-only, delegate to existing `server/services/*`. |
| `prompts/supervisor.prompt.js` | Persona + serializes grounded tool data into the system prompt. |
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

## Why a keyword planner instead of LLM function-calling

Zero latency/cost for tool selection, fully deterministic, and testable with
plain unit tests (see `planner.test.js`). The swap-in point for LLM-driven
planning is marked in `planner.js` — replace the body of `plan()` with a
function-calling call using `toolRegistry.getAllTools()` to build the schema.
Executor and the tool contract don't need to change.

## Testing

No test framework was added — everything runs on Node's built-in `node:test`.

```
npm run test
```

- `planner.test.js`, `executor.test.js`, `toolResult.test.js` — pure logic, no DB, no flags.
- `toolRegistry.test.js` — includes a live discovery test against the real `tools/` folder.
- `*.tool.test.js` — stub the service layer with `node:test`'s built-in ESM
  mocking (`mock.module`), which requires Node ≥22.3 and the
  `--experimental-test-module-mocks` flag (already in the `test` script).

## Known trade-offs (worth knowing for a walkthrough)

- **Planner is heuristic, not LLM-driven.** Fast and free, but won't handle
  novel phrasing outside its keyword list — falls back to a broad
  analytics+inventory summary rather than guessing wrong.
- **Tool results are capped in citations** (`agent.js`'s `previewData`, 1200
  chars) since citations get persisted per chat message in MongoDB —
  intentional trade-off between transparency and document size.
- **`userId` is the only context threaded through today** (for personalizing
  notifications). Extending `executor.execute(planSteps, context)`'s second
  argument is the place to add more (e.g. `role` for permission-aware tools).