import { Router } from '../router.js';
import auth from './auth.routes.js';
import vendors from './vendor.routes.js';
import po from './po.routes.js';
import pr from './purchaseRequest.routes.js';
import grn from './grn.routes.js';
import inventory from './inventory.routes.js';
import dashboard from './dashboard.routes.js';
import ai from './ai.routes.js';
import workspace from './workspace.routes.js';
import notifications from './notification.routes.js';
import analytics from './analytics.routes.js';
import reports from './report.routes.js';
import team from './team.routes.js';
import metrics from './metrics.routes.js';
import uploads from './upload.routes.js';

const api = new Router();

function mount(prefix, child) {
  for (const layer of child.stack) {
    const path = layer.path === '*' ? '*' : `${prefix}${layer.path === '/' ? '' : layer.path}`;
    api.stack.push({ ...layer, path });
  }
  for (const e of child.errorStack) api.errorStack.push(e);
}

mount('/auth', auth);
mount('/vendors', vendors);
mount('/purchase-requests', pr);
mount('/purchase-orders', po);
mount('/grn', grn);
mount('/inventory', inventory);
mount('/ai', ai);
mount('/workspace', workspace);
mount('/notifications', notifications);
mount('/analytics', analytics);
mount('/reports', reports);
mount('/team', team);
mount('/uploads', uploads);
// Health & metrics at root level (no prefix)
for (const layer of metrics.stack) api.stack.push(layer);
mount('/dashboard', dashboard);

export default api;