// Re-exports the project's existing structured logger so the ai/ module stays
// consistent with the rest of the codebase (one logger, one JSON format).
//
// If src/ai ever needs to run outside this Next.js project (e.g. extracted
// into its own package), swap this import for a local implementation with the
// same interface: debug/info/warn/error(msg, meta) and child(bindings).
import { logger as rootLogger } from '../../../server/utils/logger.js';

export const logger = rootLogger.child({ scope: 'ai' });