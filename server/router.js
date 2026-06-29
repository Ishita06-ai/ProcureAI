// Minimal Express-portable router.
// Middleware signature matches Express exactly: (req, res, next) and (err, req, res, next).
// Handlers do NOT need to await next() — completion is tracked via res._sent.
import { ApiError } from './utils/apiError.js';

export class Router {
  constructor() { this.stack = []; this.errorStack = []; }

  _add(method, path, handlers) { this.stack.push({ method, path, handlers }); return this; }

  use(...fns) {
    for (const fn of fns) {
      if (fn.length === 4) this.errorStack.push(fn);
      else this.stack.push({ method: 'ALL', path: '*', handlers: [fn] });
    }
    return this;
  }
  get(p, ...h)    { return this._add('GET', p, h); }
  post(p, ...h)   { return this._add('POST', p, h); }
  put(p, ...h)    { return this._add('PUT', p, h); }
  patch(p, ...h)  { return this._add('PATCH', p, h); }
  delete(p, ...h) { return this._add('DELETE', p, h); }

  _match(route, path) {
    if (route === '*') return {};
    const rk = route.split('/').filter(Boolean);
    const pk = path.split('/').filter(Boolean);
    if (rk.length !== pk.length) return null;
    const params = {};
    for (let i = 0; i < rk.length; i++) {
      if (rk[i].startsWith(':')) params[rk[i].slice(1)] = decodeURIComponent(pk[i]);
      else if (rk[i] !== pk[i]) return null;
    }
    return params;
  }

  _collect(req) {
    const layers = [];
    for (const layer of this.stack) {
      if (layer.method !== 'ALL' && layer.method !== req.method) continue;
      const params = this._match(layer.path, req.path);
      if (params === null) continue;
      Object.assign(req.params, params);
      layers.push(...layer.handlers);
    }
    return layers;
  }

  async handle(req, res) {
    const layers = this._collect(req);

    // Promise that resolves when response is sent (or chain completes without sending).
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });

    // Patch res terminators so we know when handling is finished.
    const wrap = (orig) => (...args) => {
      const out = orig.apply(res, args);
      res._sent = true;
      resolveDone();
      return out;
    };
    res.json = wrap(res.json);
    res.send = wrap(res.send);
    res.end  = wrap(res.end);

    let i = 0;
    const errorStack = this.errorStack;

    const runErrors = (err, j = 0) => {
      const fn = errorStack[j];
      if (!fn) {
        if (!res._sent) {
          res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Server error', ...(err.details && { details: err.details }) },
          });
        } else { resolveDone(); }
        return;
      }
      try {
        Promise.resolve(fn(err, req, res, (e) => runErrors(e || err, j + 1)))
          .catch((e) => runErrors(e, j + 1));
      } catch (e) { runErrors(e, j + 1); }
    };

    const next = (err) => {
      if (res._sent) return;
      if (err) return runErrors(err);
      const fn = layers[i++];
      if (!fn) return runErrors(new ApiError(404, `Route ${req.method} ${req.path} not found`));
      try {
        Promise.resolve(fn(req, res, next)).catch((e) => runErrors(e));
      } catch (e) { runErrors(e); }
    };

    next();

    // Safety timeout so a missing res.json() can't hang the request.
    await Promise.race([
      done,
      new Promise((r) => setTimeout(() => { if (!res._sent) r(); }, 15000)),
    ]);
  }
}
