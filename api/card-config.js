import Redis from 'ioredis';

const REDIS_KEY = 'wedding_card_config';
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // CRITICAL: Strictly forbid any caching on Edge / CDN / Browser so updates sync in 0.01s
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
      if (!raw) {
        return res.status(200).json({ success: true, config: null });
      }
      return res.status(200).json({ success: true, config: JSON.parse(raw) });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (!body && req.readable) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          body = {};
        }
      } else if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      if (!body || (!body.groom && !body.profiles)) {
        return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
      }

      const configToSave = {
        activeProfile: body.activeProfile || body.profiles?.activeProfile || 'groom',
        groom: body.groom || body.profiles?.groom,
        bride: body.bride || body.profiles?.bride,
        updatedAt: Date.now()
      };

      // Sanitize dead blob urls in music to point to permanent track files
      const cleanMusic = (m) => {
        if (!m) return m;
        const activeId = m.activeTrackId;
        if (!m.customTrackUrl || m.customTrackUrl.startsWith('blob:')) {
          if (activeId && activeId.startsWith('track-')) {
            m.customTrackUrl = `/templates/007/tracks/${activeId}.m4a`;
          } else {
            m.customTrackUrl = '/templates/007/music.m4a';
          }
        }
        if (Array.isArray(m.presetTracks)) {
          m.presetTracks = m.presetTracks.map(t => {
            const trackUrl = (t.url && !t.url.startsWith('blob:') && t.url !== '/templates/007/music.m4a')
              ? t.url
              : (t.id && t.id.startsWith('track-'))
                ? `/templates/007/tracks/${t.id}.m4a`
                : '/templates/007/music.m4a';
            return {
              ...t,
              url: trackUrl
            };
          });
        }
        return m;
      };

      if (configToSave.groom?.music) configToSave.groom.music = cleanMusic(configToSave.groom.music);
      if (configToSave.bride?.music) configToSave.bride.music = cleanMusic(configToSave.bride.music);

      await redis.set(REDIS_KEY, JSON.stringify(configToSave));

      // Dual-sync to Supabase Cloud Database (if configured)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/wedding_card_config`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ id: 'current', data: configToSave, updated_at: new Date().toISOString() })
        }).catch(e => console.warn('Supabase dual-sync notice:', e.message));
      }

      return res.status(200).json({ success: true, updatedAt: configToSave.updatedAt });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Config API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
