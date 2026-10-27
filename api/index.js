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

async function fetchConfig(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedConfig && (now - lastFetchTime < 2000)) {
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
  // Support robots.txt directly as clean text/plain for search engines & social crawlers
  if (req.url === '/robots.txt' || req.url?.startsWith('/robots.txt')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send("User-agent: *\nAllow: /\n");
  }

  const { to, guest, name, salutation, xungho, side, profile, v, t } = req.query || {};
  const guestName = String(to || guest || name || '').trim();
  const guestSal = String(salutation || xungho || 'Trân trọng kính mời').trim();

  // If request has cache buster v or t, force fresh fetch from Redis
  const forceFresh = Boolean(v || t);
  const config = await fetchConfig(forceFresh);

  // Robust bride detection
  const sideParam = String(side || profile || '').toLowerCase();
  let isBride = sideParam === 'bride' || sideParam === '2' || sideParam === 'nhagai' || sideParam === 'gai';
  if (!sideParam && guestName && config) {
    const inBride = (config.bride?.guests || []).some(g => (g.name || '').trim().toLowerCase() === guestName.toLowerCase());
    if (inBride) isBride = true;
  }

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

  // OpenGraph Canonical URL: Point to canonical root for Groom, and ?side=bride for Bride
  // This allows Facebook & Messenger to immediately reuse the globally cached preview card for all guest links!
  const baseCanonical = 'https://thiepcuoi-hieuthuy-web.vercel.app';
  const cleanCanonicalUrl = isBride 
    ? `${baseCanonical}/?side=bride` 
    : `${baseCanonical}/`;

  // Replace Title tag
  html = html.replace(/<title>[^<]*<\/title>/gi, `<title>${safeTitle}</title>`);

  // Replace or inject OpenGraph meta tags
  html = html.replace(/<meta property="og:title"[^>]*>/gi, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/gi, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/gi, `<meta property="og:image" content="${safeImage}" />`);
  html = html.replace(/<meta property="og:image:secure_url"[^>]*>/gi, `<meta property="og:image:secure_url" content="${safeImage}" />`);
  html = html.replace(/<meta property="og:image:alt"[^>]*>/gi, `<meta property="og:image:alt" content="${safeTitle}" />`);
  html = html.replace(/<meta property="og:url"[^>]*>/gi, `<meta property="og:url" content="${cleanCanonicalUrl}" />`);
  html = html.replace(/<meta property="og:site_name"[^>]*>/gi, `<meta property="og:site_name" content="Thiệp Cưới Online" />`);
  html = html.replace(/<meta property="og:locale"[^>]*>/gi, `<meta property="og:locale" content="vi_VN" />`);
  html = html.replace(/<meta property="fb:app_id"[^>]*>/gi, '');

  // Replace Twitter Card meta tags
  html = html.replace(/<meta name="twitter:title"[^>]*>/gi, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/gi, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta name="twitter:image"[^>]*>/gi, `<meta name="twitter:image" content="${safeImage}" />`);

  // Differentiate response headers:
  // For crawlers (Facebook Messenger, Zalo, Twitter): Must provide public cache so Facebook crawler accepts and stores rich link card
  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  const isCrawler = /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|facebookcatalog|facebookplatform|zalo|twitterbot|pinterest|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|bot|crawler|spider/i.test(userAgent);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (isCrawler) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, must-revalidate');
  }
  res.status(200).send(html);
}
