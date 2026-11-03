import Redis from 'ioredis';

const REDIS_KEY = 'wedding_card_config';
const DEFAULT_REDIS_URL = 'redis://default:1CoqVoDZ9zok85R9QyvXyok7L856XXIh@palatial-clover-caring-84399.db.redis.io:17074';

let redisInstance = null;
function getRedis() {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REDIS_URL || DEFAULT_REDIS_URL;
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      lazyConnect: true
    });
  }
  return redisInstance;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let side = 'groom';
    let query = { ...(req.query || {}) };
    try {
      const parsed = new URL(req.url || '/', 'https://thiepcuoi-hieuthuy-web.vercel.app');
      for (const [k, val] of parsed.searchParams.entries()) {
        if (query[k] === undefined) query[k] = val;
      }
    } catch (e) {}

    const sideParam = String(query.side || query.profile || '').toLowerCase();
    if (sideParam === 'bride' || sideParam === 'co-dau' || sideParam === 'nhagai' || sideParam === '2') {
      side = 'bride';
    }

    const redis = getRedis();
    const raw = await redis.get(REDIS_KEY);
    if (!raw) {
      return res.redirect(302, 'https://thiepcuoi-hieuthuy-web.vercel.app/templates/007/images/og_banner.jpg');
    }

    const config = JSON.parse(raw);
    const profile = side === 'bride' ? config.bride : config.groom;

    // Priority for thumbnail (strictly separated between Nhà Trai and Nhà Gái):
    // 1. Configured socialShare.thumbnail on active profile
    // 2. heroBannerPhoto on active profile
    // 3. coverConfig.style1.photo on active profile
    // 4. Default demo banner
    let imageSrc = profile?.socialShare?.thumbnail ||
                   profile?.heroBannerPhoto ||
                   profile?.coverConfig?.style1?.photo ||
                   '/templates/007/images/og_banner.jpg';

    if (typeof imageSrc !== 'string' || !imageSrc.trim()) {
      imageSrc = '/templates/007/images/og_banner.jpg';
    }
    imageSrc = imageSrc.trim();

    // If it's a base64 Data URL, extract buffer and stream binary image
    if (imageSrc.startsWith('data:image/')) {
      const matches = imageSrc.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const mimeType = matches[1];
        const imageBuffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', imageBuffer.length);
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        return res.status(200).send(imageBuffer);
      }
    }

    // If it's an external absolute URL
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return res.redirect(302, imageSrc);
    }

    // If it's a relative path on this site
    const baseUrl = 'https://thiepcuoi-hieuthuy-web.vercel.app';
    const finalUrl = `${baseUrl}${imageSrc.startsWith('/') ? '' : '/'}${imageSrc}`;
    return res.redirect(302, finalUrl);
  } catch (err) {
    console.error('OG Image generation error:', err);
    return res.redirect(302, 'https://thiepcuoi-hieuthuy-web.vercel.app/templates/007/images/og_banner.jpg');
  }
}
