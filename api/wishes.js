import Redis from 'ioredis';

const REDIS_KEY = 'wedding_wishes_list';
const DEFAULT_REDIS_URL = 'redis://default:1CoqVoDZ9zok85R9QyvXyok7L856XXIh@palatial-clover-caring-84399.db.redis.io:17074';

let redisInstance = null;

function getRedis() {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REDIS_URL || DEFAULT_REDIS_URL;
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true
    });
  }
  return redisInstance;
}

export default async function handler(req, res) {
  // CORS & Strict No-Cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();

  try {
    if (req.method === 'GET') {
      const raw = await redis.get(REDIS_KEY);
      let wishes = [];
      if (raw) {
        try {
          wishes = JSON.parse(raw);
        } catch {
          wishes = [];
        }
      }
      return res.status(200).json({ success: true, wishes });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (!body && req.readable) {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const str = Buffer.concat(chunks).toString('utf8');
        try {
          body = JSON.parse(str);
        } catch {
          body = {};
        }
      } else if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const { name, message, relationship, side, sideLabel } = body || {};
      if (!name || !message) {
        return res.status(400).json({ success: false, error: 'Thiếu họ tên hoặc lời chúc' });
      }

      const newWish = {
        id: body.id || `wish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: String(name).trim(),
        message: String(message).trim(),
        relationship: (relationship || 'Khách quý').trim(),
        side: side === 'bride' ? 'bride' : 'groom',
        sideLabel: sideLabel || (side === 'bride' ? 'Nhà Gái' : 'Nhà Trai'),
        createdAt: 'Vừa xong',
        timestamp: Date.now()
      };

      const raw = await redis.get(REDIS_KEY);
      let wishes = [];
      if (raw) {
        try {
          wishes = JSON.parse(raw);
        } catch {
          wishes = [];
        }
      }

      // Prepend new wish, deduplicate by id
      wishes = [newWish, ...wishes.filter(w => w.id !== newWish.id)];
      // Keep up to 500 wishes
      if (wishes.length > 500) wishes = wishes.slice(0, 500);

      await redis.set(REDIS_KEY, JSON.stringify(wishes));

      // Dual-sync to Supabase Cloud Database (if configured)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/wedding_wishes`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(newWish)
        }).catch(e => console.warn('Supabase wish dual-sync notice:', e.message));
      }

      return res.status(200).json({ success: true, wish: newWish, wishes });
    }

    if (req.method === 'DELETE') {
      let id = req.query?.id;
      if (!id && req.body) {
        let body = req.body;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch {}
        }
        id = body?.id;
      }

      if (!id) {
        return res.status(400).json({ success: false, error: 'Thiếu ID lời chúc cần xóa' });
      }

      const raw = await redis.get(REDIS_KEY);
      let wishes = [];
      if (raw) {
        try {
          wishes = JSON.parse(raw);
        } catch {
          wishes = [];
        }
      }

      wishes = wishes.filter(w => w.id !== id);
      await redis.set(REDIS_KEY, JSON.stringify(wishes));

      return res.status(200).json({ success: true, wishes });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Wishes API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
