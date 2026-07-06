// InventoryTool — surfaces stock health signals (low stock, warehouse
// utilization, KPIs) so the agent can ground answers about inventory
// without touching MongoDB directly. Reuses the existing StockService.
import { StockService } from '../../../server/services/stock.service.js';

export default {
  name: 'inventory',
  description: 'Low-stock items, warehouse utilization, and inventory KPIs from live stock data.',

  /**
   * @param {{limit?: number}} input
   */
  async execute(input = {}) {
    const limit = input.limit ?? 10;
    const [lowStock, dashboard] = await Promise.all([
      StockService.lowStockReport(),
      StockService.dashboard(),
    ]);

    return {
      kpis: dashboard.kpis,
      byWarehouse: dashboard.byWarehouse,
      lowStockItems: lowStock.slice(0, limit).map((p) => ({
        sku: p.sku,
        name: p.name,
        available: p.available,
        reorderLevel: p.reorderLevel,
        deficit: p.deficit,
        leadTimeDays: p.leadTimeDays,
      })),
    };
  },
};