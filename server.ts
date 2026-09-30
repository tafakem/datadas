import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getDatabase,
  getAtencionesPaged,
  getDashboardAggregatedStats,
  getFilterOptions,
  insertAtencionesBatch,
  deleteAtencionesByPeriod,
  deleteAtencionById,
  getDigitadoresList,
  addOrUpdateDigitadoresBatch,
  deleteDigitadorById,
  generateBenchmarkRecords,
  persistDatabase,
  clearAtencionesData,
} from './src/server/db';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Support large JSON payloads for high-volume Excel batches
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Initialize SQLite database
  getDatabase();

  // -------------------------------------------------------------
  // REST API ROUTES
  // -------------------------------------------------------------

  // Health check & Database status
  app.get('/api/health', (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const countRow = db.prepare('SELECT count(*) as total FROM atenciones').get() as { total: number };
      const total = countRow ? Number(countRow.total) : 0;
      const mem = process.memoryUsage();
      res.json({
        status: 'ok',
        engine: 'SQLite 3 (Native C++ / WAL Mode / B-Tree Indexed / Memory-Mapped)',
        totalAtenciones: total,
        memoryHeapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        memoryRssMB: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear demo atenciones while keeping users, digitadores & logs intact
  app.post('/api/admin/clear-demo-data', (req: Request, res: Response) => {
    try {
      const result = clearAtencionesData();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Server-side paginated atenciones
  app.get('/api/atenciones', async (req: Request, res: Response) => {
    try {
      const { page, pageSize, search, sortBy, sortDir, ...restFilters } = req.query;
      const filters: Record<string, string> = {};
      for (const [key, value] of Object.entries(restFilters)) {
        if (typeof value === 'string' && value.trim() && value !== 'TODOS') {
          filters[key] = value.trim();
        }
      }

      const result = await getAtencionesPaged({
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 15,
        search: typeof search === 'string' ? search : undefined,
        filters,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortDir: sortDir === 'ASC' ? 'ASC' : 'DESC',
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error fetching paged atenciones:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Aggregated Dashboard stats (Instant SQL queries with indexes)
  app.get('/api/stats/dashboard', async (req: Request, res: Response) => {
    try {
      const filters: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && value.trim() && value !== 'TODOS') {
          filters[key] = value.trim();
        }
      }
      const stats = await getDashboardAggregatedStats(filters);
      res.json(stats);
    } catch (err: any) {
      console.error('Error calculating dashboard stats:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Filter options for fast dropdown rendering
  app.get('/api/filter-options', async (req: Request, res: Response) => {
    try {
      const options = await getFilterOptions();
      res.json(options);
    } catch (err: any) {
      console.error('Error fetching filter options:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Batch insert/upsert for Excel chunk processing
  app.post('/api/atenciones/batch', async (req: Request, res: Response) => {
    try {
      const { rows, updateExisting, currentUser } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Se requiere un arreglo de registros' });
      }

      const result = await insertAtencionesBatch(rows, Boolean(updateExisting), currentUser || 'sistema');
      res.json(result);
    } catch (err: any) {
      console.error('Error processing batch:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete records by period
  app.post('/api/atenciones/delete-period', async (req: Request, res: Response) => {
    try {
      const { period } = req.body;
      if (!period) return res.status(400).json({ error: 'Período no especificado' });
      const count = await deleteAtencionesByPeriod(period);
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete single atencion
  app.delete('/api/atenciones/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await deleteAtencionById(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Digitadores list
  app.get('/api/digitadores', async (req: Request, res: Response) => {
    try {
      const list = await getDigitadoresList();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Digitadores batch import
  app.post('/api/digitadores/batch', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un arreglo de digitadores' });
      }
      const result = await addOrUpdateDigitadoresBatch(items);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete digitador
  app.delete('/api/digitadores/:id', async (req: Request, res: Response) => {
    try {
      await deleteDigitadorById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Performance Benchmark generation endpoint (100k, 500k, 1M, 2M+ records)
  app.post('/api/benchmark/generate', async (req: Request, res: Response) => {
    try {
      const count = Math.min(2500000, Math.max(1000, Number(req.body.count) || 100000));
      console.log(`Starting benchmark generation for ${count.toLocaleString()} records...`);
      const result = await generateBenchmarkRecords(count);
      console.log(`Benchmark completed: ${result.generated} records in ${result.elapsedMs}ms`);
      res.json(result);
    } catch (err: any) {
      console.error('Benchmark generation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER / PRODUCTION STATIC ASSETS
  // -------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/*.sqlite*'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  // Graceful shutdown flush
  process.on('SIGINT', () => {
    console.log('Flushing database before exit...');
    persistDatabase();
    process.exit(0);
  });

  app.listen(PORT, HOST, () => {
    console.log(`Health Statistics Full-Stack Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
