import Redis from 'ioredis';

const REDIS_KEY = 'wedding_card_config';
const REDIS_USERS_KEY = 'wedding_auth_users';
const SUPER_ADMIN_EMAIL = 'hoangdinhhieu1410@gmail.com';
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
      const config = JSON.parse(raw);
      // Enforce single source of truth for wishes so card-config and wishes API never conflict
      try {
        const rawWishes = await redis.get('wedding_wishes_list');
        const currentWishes = rawWishes ? JSON.parse(rawWishes) : [];
        if (config.groom) config.groom.wishes = currentWishes;
        if (config.bride) config.bride.wishes = currentWishes;
      } catch (eWishes) {}
      return res.status(200).json({ success: true, config });
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

      if (!body) {
        return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
      }

      // Identify which profile is targeted: 'groom', 'bride', or 'both'
      const targetProfile = body.targetProfile || body.profileKey || (body.groom && !body.bride ? 'groom' : (!body.groom && body.bride ? 'bride' : 'both'));

      const newGroom = body.groom || (targetProfile === 'groom' ? body[body.profileKey] : null) || body.profiles?.groom;
      const newBride = body.bride || (targetProfile === 'bride' ? body[body.profileKey] : null) || body.profiles?.bride;

      if (!newGroom && !newBride && !body.profiles) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thiệp cưới để lưu' });
      }

      // Check user permissions against Redis auth database
      const userEmail = (body.userEmail || '').trim().toLowerCase();
      if (userEmail && userEmail !== SUPER_ADMIN_EMAIL) {
        try {
          const usersRaw = await redis.get(REDIS_USERS_KEY);
          const users = usersRaw ? JSON.parse(usersRaw) : {};
          const user = users[userEmail];
          if (user) {
            if (user.status !== 'approved' || user.role === 'viewer') {
              return res.status(403).json({ success: false, error: 'Tài khoản của bạn chỉ có quyền xem, không được phép lưu thay đổi.' });
            }
            const allowed = Array.isArray(user.allowedProfiles) && user.allowedProfiles.length > 0 ? user.allowedProfiles : ['groom', 'bride'];
            if (targetProfile === 'groom' && !allowed.includes('groom')) {
              return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa Mẫu 1 (Nhà Trai).' });
            }
            if (targetProfile === 'bride' && !allowed.includes('bride')) {
              return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa Mẫu 2 (Nhà Gái).' });
            }
          }
        } catch (errAuth) {
          console.warn('Auth check error in card-config:', errAuth);
        }
      }

      // Read current config to perform atomic independent merge
      const rawCurrent = await redis.get(REDIS_KEY);
      let configToSave = rawCurrent ? JSON.parse(rawCurrent) : {};
      if (!configToSave || typeof configToSave !== 'object') configToSave = {};

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

      // ATOMIC MERGE:
      // If saving groom: ONLY update groom, keeping bride completely untouched
      // If saving bride: ONLY update bride, keeping groom completely untouched
      // If saving both: update both
      if (targetProfile === 'groom' && newGroom) {
        configToSave.groom = newGroom;
        configToSave.activeProfile = 'groom';
      } else if (targetProfile === 'bride' && newBride) {
        configToSave.bride = newBride;
        configToSave.activeProfile = 'bride';
      } else {
        if (newGroom) configToSave.groom = newGroom;
        if (newBride) configToSave.bride = newBride;
        if (body.activeProfile) configToSave.activeProfile = body.activeProfile;
      }

      configToSave.updatedAt = Date.now();
      configToSave.lastSavedProfile = targetProfile;
      configToSave.lastSavedBy = userEmail || 'system';

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

      return res.status(200).json({
        success: true,
        updatedAt: configToSave.updatedAt,
        lastSavedProfile: targetProfile,
        config: configToSave
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Config API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
