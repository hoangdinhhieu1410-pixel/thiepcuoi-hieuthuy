import Redis from 'ioredis';

const REDIS_KEY = 'wedding_wishes_list';
const CARD_CONFIG_KEY = 'wedding_card_config';
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

async function executeDelete(id, targetName, targetMessage, redis, res) {
  if (!id && !targetName && !targetMessage) {
    return res.status(400).json({ success: false, error: 'Thiếu ID hoặc thông tin lời chúc cần xóa' });
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

  const isMatch = (w) => {
    if (!w) return false;
    if (id === 'all' || id === 'purge_all') return true;
    if (id && w.id === id) return true;
    if (targetName && targetMessage && w.name?.trim() === targetName && w.message?.trim() === targetMessage) return true;
    return false;
  };

  if (id === 'all' || id === 'purge_all') {
    wishes = [];
  } else {
    wishes = wishes.filter(w => !isMatch(w));
  }

  await redis.set(REDIS_KEY, JSON.stringify(wishes));

  // Dual-sync deletion directly into wedding_card_config in Redis
  try {
    const rawConfig = await redis.get(CARD_CONFIG_KEY);
    if (rawConfig) {
      const config = JSON.parse(rawConfig);
      let configChanged = false;

      if (config.groom && Array.isArray(config.groom.wishes)) {
        const before = config.groom.wishes.length;
        config.groom.wishes = (id === 'all' || id === 'purge_all') ? [] : config.groom.wishes.filter(w => !isMatch(w));
        if (config.groom.wishes.length !== before || id === 'all') configChanged = true;
      }
      if (config.bride && Array.isArray(config.bride.wishes)) {
        const before = config.bride.wishes.length;
        config.bride.wishes = (id === 'all' || id === 'purge_all') ? [] : config.bride.wishes.filter(w => !isMatch(w));
        if (config.bride.wishes.length !== before || id === 'all') configChanged = true;
      }

      if (configChanged || id === 'all' || id === 'purge_all') {
        config.updatedAt = Date.now();
        await redis.set(CARD_CONFIG_KEY, JSON.stringify(config));
      }
    }
  } catch (errCfg) {
    console.warn('Sync wish deletion to card-config notice:', errCfg.message);
  }

  // Dual-sync delete to Supabase if configured
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    let endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/wedding_wishes`;
    if (id === 'all' || id === 'purge_all') {
      endpoint += `?id=neq.placeholder_never_match`;
    } else if (id) {
      endpoint += `?id=eq.${encodeURIComponent(id)}`;
    } else if (targetName && targetMessage) {
      endpoint += `?name=eq.${encodeURIComponent(targetName)}&message=eq.${encodeURIComponent(targetMessage)}`;
    }
    fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }).catch(e => console.warn('Supabase wish delete notice:', e.message));
  }

  return res.status(200).json({ success: true, wishes });
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
      // Ensure all wishes have standardized date format DD/MM/YYYY
      wishes = wishes.map(w => {
        let dateFormatted = w.createdAt;
        if (!dateFormatted || dateFormatted === 'Vừa xong' || dateFormatted === 'Mới') {
          const ts = w.timestamp || (typeof w.id === 'string' && w.id.startsWith('wish-') ? parseInt(w.id.split('-')[1], 10) : Date.now());
          const d = new Date(ts);
          dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
        return { ...w, createdAt: dateFormatted };
      });
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

      // Check for action=delete via POST for maximum client compatibility
      if (body?.action === 'delete' || req.query?.action === 'delete') {
        const id = req.query?.id || body?.id;
        const targetName = (body?.name || req.query?.name || '').trim();
        const targetMessage = (body?.message || req.query?.message || '').trim();
        return await executeDelete(id, targetName, targetMessage, redis, res);
      }

      const { name, message, relationship, side, sideLabel } = body || {};
      if (!name || !message) {
        return res.status(400).json({ success: false, error: 'Thiếu họ tên hoặc lời chúc' });
      }

      const now = new Date();
      const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const newWish = {
        id: body.id || `wish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: String(name).trim(),
        message: String(message).trim(),
        relationship: (relationship || 'Khách quý').trim(),
        side: side === 'bride' ? 'bride' : 'groom',
        sideLabel: sideLabel || (side === 'bride' ? 'Nhà Gái' : 'Nhà Trai'),
        createdAt: dateFormatted,
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

      // Dual-sync into wedding_card_config in Redis so polling card-config also receives new wish immediately
      try {
        const rawConfig = await redis.get(CARD_CONFIG_KEY);
        if (rawConfig) {
          const config = JSON.parse(rawConfig);
          let configChanged = false;
          if (config.groom) {
            const gw = Array.isArray(config.groom.wishes) ? config.groom.wishes : [];
            config.groom.wishes = [newWish, ...gw.filter(w => w.id !== newWish.id)].slice(0, 500);
            configChanged = true;
          }
          if (config.bride) {
            const bw = Array.isArray(config.bride.wishes) ? config.bride.wishes : [];
            config.bride.wishes = [newWish, ...bw.filter(w => w.id !== newWish.id)].slice(0, 500);
            configChanged = true;
          }
          if (configChanged) {
            config.updatedAt = Date.now();
            await redis.set(CARD_CONFIG_KEY, JSON.stringify(config));
          }
        }
      } catch (errCfg) {
        console.warn('Sync wish post to card-config notice:', errCfg.message);
      }

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
      const id = req.query?.id;
      const targetName = (req.query?.name || '').trim();
      const targetMessage = (req.query?.message || '').trim();
      return await executeDelete(id, targetName, targetMessage, redis, res);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Wishes API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
