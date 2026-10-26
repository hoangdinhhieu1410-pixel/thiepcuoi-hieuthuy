import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { to, guest, name, salutation, xungho, side, profile } = req.query;
  const guestName = to || guest || name || '';
  const guestSal = salutation || xungho || 'Trân trọng kính mời';
  const isBride = side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai' || profile === 'bride';

  const coupleNames = isBride ? 'Thanh Thúy ♥ Đình Hiếu' : 'Đình Hiếu ♥ Thanh Thúy';
  const title = guestName 
    ? `Thư mời cưới ${coupleNames} - ${guestSal} ${guestName}`
    : `Thư mời cưới ${coupleNames}`;
  const description = guestName
    ? `${guestSal} ${guestName} đến tham dự lễ cưới chung vui cùng gia đình chúng tôi! Sự hiện diện của ${guestName} là niềm vinh dự lớn của gia đình.`
    : `Thiệp cưới online của ${coupleNames} nơi gửi gắm lời mời trân trọng và câu chuyện tình yêu đong đầy ý nghĩa.`;

  const ogImage = 'https://thiepcuoi-hieuthuy-web.vercel.app/templates/007/images/og_banner.jpg';

  // Read index.html from dist or root
  let htmlPath = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    htmlPath = path.join(process.cwd(), 'index.html');
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace OG tags with dynamic personalized values
  html = html.replace(/<meta property="og:title"[^>]*>/gi, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/gi, `<meta property="og:description" content="${description}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/gi, `<meta property="og:image" content="${ogImage}" />`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/gi, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/gi, `<meta name="twitter:description" content="${description}" />`);
  html = html.replace(/<meta name="twitter:image"[^>]*>/gi, `<meta name="twitter:image" content="${ogImage}" />`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(html);
}
