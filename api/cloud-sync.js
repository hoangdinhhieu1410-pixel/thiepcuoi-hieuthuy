import Redis from 'ioredis';

const REDIS_CONFIG_KEY = 'wedding_card_config';
const REDIS_WISHES_KEY = 'wedding_wishes_list';
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

/**
 * Helper to sync or backup data to Supabase REST API (if SUPABASE_URL & SUPABASE_KEY are provided)
 */
export async function syncToSupabase(tableName, payload) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('Supabase sync warning:', err.message);
    return false;
  }
}

/**
 * Health-check & Multi-Cloud Status Endpoint
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();

  try {
    // 1. Check Redis status
    let redisStatus = 'connected';
    let redisPingMs = 0;
    try {
      const start = Date.now();
      await redis.ping();
      redisPingMs = Date.now() - start;
    } catch (e) {
      redisStatus = 'error: ' + e.message;
    }

    // 2. Check Supabase status
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseStatus = supabaseUrl && supabaseKey ? 'configured' : 'ready_for_keys';

    // 3. Check Cloudinary status
    const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL;
    const cloudinaryStatus = cloudinaryCloud ? 'configured' : 'ready_for_keys';

    // 4. Check Cloudflare R2 status
    const r2AccountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const r2Status = r2AccountId ? 'configured' : 'ready_for_keys';

    if (req.method === 'GET') {
      const action = req.query?.action;

      // Full database dump / backup action
      if (action === 'dump') {
        const [configRaw, wishesRaw] = await Promise.all([
          redis.get(REDIS_CONFIG_KEY).catch(() => null),
          redis.get(REDIS_WISHES_KEY).catch(() => null)
        ]);

        return res.status(200).json({
          success: true,
          timestamp: Date.now(),
          exportedAt: new Date().toISOString(),
          version: '2.0-multi-cloud',
          data: {
            config: configRaw ? JSON.parse(configRaw) : null,
            wishes: wishesRaw ? JSON.parse(wishesRaw) : []
          }
        });
      }

      // Default: Health & multi-cloud status report
      return res.status(200).json({
        success: true,
        timestamp: Date.now(),
        services: {
          redis: {
            provider: 'Upstash Redis Cloud (Global In-Memory)',
            status: redisStatus,
            latencyMs: redisPingMs,
            active: redisStatus === 'connected'
          },
          supabase: {
            provider: 'Supabase PostgreSQL & Cloud DB',
            status: supabaseStatus,
            active: supabaseStatus === 'configured',
            description: 'Sao lưu dữ liệu quan hệ dự phòng tầng 2'
          },
          cloudinary: {
            provider: 'Cloudinary Media CDN',
            status: cloudinaryStatus,
            active: cloudinaryStatus === 'configured',
            description: 'Tối ưu ảnh WebP/AVIF và nén tự động'
          },
          cloudflareR2: {
            provider: 'Cloudflare R2 Object Storage',
            status: r2Status,
            active: r2Status === 'configured',
            description: 'Lưu file nhạc và album ảnh không giới hạn băng thông (0đ Egress)'
          },
          browserOffline: {
            provider: 'IndexedDB & LocalStorage',
            status: 'active',
            active: true,
            description: 'Lưu bộ nhớ tạm trên thiết bị khách mời (Chống mất mạng tạm thời)'
          }
        }
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action;

      // Dual-sync action: synchronizes data across Redis and Supabase
      if (action === 'dual_sync') {
        const configRaw = await redis.get(REDIS_CONFIG_KEY);
        const wishesRaw = await redis.get(REDIS_WISHES_KEY);

        let supabaseSyncSuccess = false;
        if (supabaseUrl && supabaseKey) {
          supabaseSyncSuccess = await syncToSupabase('wedding_snapshots', {
            id: 'latest',
            config_data: configRaw ? JSON.parse(configRaw) : null,
            wishes_data: wishesRaw ? JSON.parse(wishesRaw) : [],
            synced_at: new Date().toISOString()
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Đã hoàn tất đồng bộ đa đám mây thành công!',
          redis: true,
          supabase: supabaseSyncSuccess
        });
      }

      // Restore full backup action
      if (action === 'restore' && body.backupData) {
        const { config, wishes } = body.backupData;
        if (config) {
          await redis.set(REDIS_CONFIG_KEY, JSON.stringify(config));
        }
        if (Array.isArray(wishes)) {
          await redis.set(REDIS_WISHES_KEY, JSON.stringify(wishes));
        }

        return res.status(200).json({
          success: true,
          message: '🎉 Đã khôi phục hoàn chỉnh dữ liệu từ file sao lưu!'
        });
      }

      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Cloud Sync API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
