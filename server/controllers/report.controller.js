import { asyncHandler } from '../utils/asyncHandler.js';
import { ReportService, ReportNames } from '../services/report.service.js';
import { recordAudit } from '../services/audit.service.js';
import { badRequest } from '../utils/apiError.js';

const HANDLERS = {
  'vendors': ReportService.vendors,
  'purchase-orders': ReportService.purchaseOrders,
  'purchase-requests': ReportService.purchaseRequests,
  'products': ReportService.products,
  'stock-movements': ReportService.stockMovements,
  'audit-log': ReportService.auditLog,
};

export const ReportController = {
  list: asyncHandler(async (req, res) => {
    res.json({ success: true, data: ReportNames.map(name => ({ name, label: name.replace(/-/g, ' ') })) });
  }),
  download: asyncHandler(async (req, res) => {
    const name = req.params.name;
    const fn = HANDLERS[name];
    if (!fn) throw badRequest(`Unknown report '${name}'. Available: ${ReportNames.join(', ')}`);
    const csv = await fn();
    await recordAudit({ req, action: 'report.download', resource: 'report', resourceId: name });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="procurio-${name}-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  }),
};
