import prisma from '../lib/prisma.js';

/* =========================================================
   LUNA GYM — Bulk sync endpoint
   GET  /api/sync  → returns full app state as JSON
   PUT  /api/sync  → replaces full app state
   Auth: x-api-key header must match SYNC_API_KEY env var
   ========================================================= */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Auth check
  const providedKey =
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace('Bearer ', '');

  if (!process.env.SYNC_API_KEY) {
    return res.status(500).json({ error: 'Server missing SYNC_API_KEY' });
  }
  if (providedKey !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    if (req.method === 'GET') {
      const row = await prisma.appState.findUnique({ where: { id: 1 } });
      return res.status(200).json({
        record: row?.data || {},
        updatedAt: row?.updatedAt || null
      });
    }

    if (req.method === 'PUT') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }

      const row = await prisma.appState.upsert({
        where: { id: 1 },
        update: { data: body },
        create: { id: 1, data: body }
      });

      return res.status(200).json({
        ok: true,
        updatedAt: row.updatedAt
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('sync error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}