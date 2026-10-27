import fs from 'fs';
import path from 'path';
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

let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 8000; // 8 seconds memory cache

async function fetchConfig() {
  const now = Date.now();
  if (cachedConfig && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedConfig;
  }
  try {
    const redis = getRedis();
    const raw = await redis.get(REDIS_KEY);
    if (raw) {
      cachedConfig = JSON.parse(raw);
      lastFetchTime = now;
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[api/index] Redis fetch failed:', err.message);
  }
  return cachedConfig;
}

export default async function handler(req, res) {
  const { to, guest, name, salutation, xungho, side, profile } = req.query || {};
  const guestName = String(to || guest || name || '').trim();
  const guestSal = String(salutation || xungho || 'Trân trọng kính mời').trim();

  // Robust bride detection
  const sideParam = String(side || profile || '').toLowerCase();
  const isBride = sideParam === 'bride' || sideParam === '2' || sideParam === 'nhagai' || sideParam === 'gai';

  // Read config from Redis (with memory cache fallback)
  const config = await fetchConfig();
  const brideProfile = config?.bride || {};
  const groomProfile = config?.groom || {};
  const activeData = isBride ? brideProfile : groomProfile;
  const social = activeData?.socialShare || {};

  // Standard Defaults
  const defaultTitle = isBride 
    ? 'Thư mời cưới Thanh Thúy ♥ Đình Hiếu' 
    : 'Thư mời cưới Đình Hiếu ♥ Thanh Thúy';
  const defaultDesc = isBride 
    ? 'Trân trọng kính mời quý khách đến chung vui lễ thành hôn của Thanh Thúy & Đình Hiếu.' 
    : 'Thiệp cưới online của Đình Hiếu ♥ Thanh Thúy nơi gửi gắm lời mời trân trọng và câu chuyện tình yêu đong đầy ý nghĩa.';
  const defaultImage = isBride
    ? (brideProfile.heroImage || 'https://thiepcuoi-hieuthuy-web.vercel.app/templates/007/images/og_banner.jpg')
    : (groomProfile.heroImage || 'https://thiepcuoi-hieuthuy-web.vercel.app/templates/007/images/og_banner.jpg');

  // Exact configured values
  let title = (social.title && social.title.trim()) ? social.title.trim() : defaultTitle;
  let description = (social.description && social.description.trim()) ? social.description.trim() : defaultDesc;
  let ogImage = (social.thumbnail && social.thumbnail.trim()) ? social.thumbnail.trim() : defaultImage;

  // Ensure ogImage is an absolute URL for social crawlers (Zalo, Facebook require absolute URLs)
  if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
    const base = 'https://thiepcuoi-hieuthuy-web.vercel.app';
    ogImage = `${base}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;
  }

  // Read HTML file (app.html or index.html)
  let html = null;
  const possiblePaths = [
    path.join(process.cwd(), 'dist', 'app.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'app.html'),
    path.join(process.cwd(), 'index.html')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      html = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (!html) {
    return res.status(500).send('HTML template not found.');
  }

  // Escape special HTML chars for attribute injection
  const escapeAttr = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const safeTitle = escapeAttr(title);
  const safeDesc = escapeAttr(description);
  const safeImage = escapeAttr(ogImage);

  // Replace Title tag
  html = html.replace(/<title>[^<]*<\/title>/gi, `<title>${safeTitle}</title>`);

  // Replace or inject OpenGraph meta tags
  html = html.replace(/<meta property="og:title"[^>]*>/gi, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/gi, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/gi, `<meta property="og:image" content="${safeImage}" />`);
  html = html.replace(/<meta property="og:image:secure_url"[^>]*>/gi, `<meta property="og:image:secure_url" content="${safeImage}" />`);
  html = html.replace(/<meta property="og:image:alt"[^>]*>/gi, `<meta property="og:image:alt" content="${safeTitle}" />`);

  // Replace Twitter Card meta tags
  html = html.replace(/<meta name="twitter:title"[^>]*>/gi, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/gi, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta name="twitter:image"[^>]*>/gi, `<meta name="twitter:image" content="${safeImage}" />`);

  // Send response with no-cache on proxy/CDN so Nhà Trai and Nhà Gái never cross-contaminate
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=0');
  res.status(200).send(html);
}
