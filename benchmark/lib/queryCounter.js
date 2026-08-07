/**
 * Mongoose query instrumentation — counts and times every DB operation that
 * flows through mongoose during a benchmark window.
 *
 * Patching happens once at import; counting is toggled via start()/stop() so
 * we only measure the window we care about (e.g. one HTTP request handling).
 */
import mongoose from 'mongoose';

const s = {
  enabled: false,
  calls: 0,        // query exec + aggregate exec
  writes: 0,       // create / insertMany / save
  ms: 0,           // total DB wall-clock ms in window
  perOp: [],       // [{kind, ms}]
};

function wrapProto(obj, method, kind, capture) {
  const orig = obj[method];
  if (!orig || orig.__wrapped) return;
  const wrapped = function (...args) {
    const t0 = performance.now();
    try {
      return orig.apply(this, args);
    } finally {
      if (s.enabled) {
        const ms = performance.now() - t0;
        s.calls++;
        s.ms += ms;
        if (capture) s.perOp.push({ kind, ms });
      }
    }
  };
  wrapped.__wrapped = true;
  obj[method] = wrapped;
}

export function install() {
  // Reads/updates/deletes that run through Query.exec (find, countDocuments, updateOne, ...)
  wrapProto(mongoose.Query.prototype, 'exec', 'query', true);
  // Aggregations
  wrapProto(mongoose.Aggregate.prototype, 'exec', 'aggregate', true);
  wrapProto(mongoose.Aggregate.prototype, 'then', 'aggregate', true);
  // Writes
  wrapProto(mongoose.Model, 'create', 'write', true);
  wrapProto(mongoose.Model, 'insertMany', 'write', true);
  wrapProto(mongoose.Document.prototype, 'save', 'write', true);
}

export function start() {
  s.enabled = true;
  s.calls = 0;
  s.writes = 0;
  s.ms = 0;
  s.perOp = [];
}

export function stop() {
  s.enabled = false;
  return snapshot();
}

export function snapshot() {
  const reads = s.perOp.filter((o) => o.kind !== 'write');
  return {
    queries: s.calls,          // total query/aggregate execs
    writes: s.writes,
    reads: reads.length,
    dbMs: Math.round(s.ms * 100) / 100,
    avgDbMsPerOp: reads.length ? Math.round((s.ms / Math.max(1, s.calls)) * 100) / 100 : 0,
  };
}

export const queryCounter = { install, start, stop, snapshot };
export default { install, start, stop, snapshot };