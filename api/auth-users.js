import Redis from 'ioredis';

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

// Load users helper
async function loadUsers(redis) {
  try {
    const raw = await redis.get(REDIS_USERS_KEY);
    let users = raw ? JSON.parse(raw) : {};
    if (!users || typeof users !== 'object') users = {};

    // Ensure Super Admin always exists and is approved with super_admin role
    if (!users[SUPER_ADMIN_EMAIL]) {
      users[SUPER_ADMIN_EMAIL] = {
        email: SUPER_ADMIN_EMAIL,
        name: 'Hoàng Đình Hiếu',
        role: 'super_admin',
        status: 'approved',
        createdAt: Date.now(),
        approvedAt: Date.now()
      };
      await redis.set(REDIS_USERS_KEY, JSON.stringify(users));
    } else if (users[SUPER_ADMIN_EMAIL].role !== 'super_admin' || users[SUPER_ADMIN_EMAIL].status !== 'approved') {
      users[SUPER_ADMIN_EMAIL].role = 'super_admin';
      users[SUPER_ADMIN_EMAIL].status = 'approved';
      await redis.set(REDIS_USERS_KEY, JSON.stringify(users));
    }

    return users;
  } catch (err) {
    console.error('Error loading auth users from Redis:', err);
    return {
      [SUPER_ADMIN_EMAIL]: {
        email: SUPER_ADMIN_EMAIL,
        name: 'Hoàng Đình Hiếu',
        role: 'super_admin',
        status: 'approved',
        createdAt: Date.now()
      }
    };
  }
}

async function saveUsers(redis, users) {
  // Never allow removing or demoting super admin
  users[SUPER_ADMIN_EMAIL] = {
    ...(users[SUPER_ADMIN_EMAIL] || {}),
    email: SUPER_ADMIN_EMAIL,
    name: 'Hoàng Đình Hiếu',
    role: 'super_admin',
    status: 'approved'
  };
  await redis.set(REDIS_USERS_KEY, JSON.stringify(users));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();

  try {
    const users = await loadUsers(redis);

    if (req.method === 'GET') {
      const email = (req.query.email || '').trim().toLowerCase();
      const requester = (req.query.requester || '').trim().toLowerCase();

      if (!email && requester !== SUPER_ADMIN_EMAIL) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số email' });
      }

      const currentUser = email ? users[email] : null;

      // If requester is Super Admin, return the full user list for the approval table
      if (requester === SUPER_ADMIN_EMAIL || email === SUPER_ADMIN_EMAIL) {
        return res.status(200).json({
          success: true,
          user: currentUser || users[SUPER_ADMIN_EMAIL],
          allUsers: Object.values(users)
        });
      }

      if (!currentUser) {
        return res.status(200).json({
          success: true,
          user: null,
          status: 'not_found',
          message: 'Tài khoản chưa được đăng ký hoặc đã bị xóa.'
        });
      }

      return res.status(200).json({
        success: true,
        user: currentUser
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (!body && req.readable) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { body = {}; }
      } else if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const { action, email, name, role, targetEmail, requesterEmail } = body || {};
      const normEmail = (email || '').trim().toLowerCase();
      const normTarget = (targetEmail || '').trim().toLowerCase();
      const normRequester = (requesterEmail || '').trim().toLowerCase();

      // ACTION 1: LOGIN / REGISTER
      if (action === 'login') {
        if (!normEmail) {
          return res.status(400).json({ success: false, error: 'Email không được để trống' });
        }

        // Super Admin instant login
        if (normEmail === SUPER_ADMIN_EMAIL) {
          users[SUPER_ADMIN_EMAIL] = {
            email: SUPER_ADMIN_EMAIL,
            name: name || 'Hoàng Đình Hiếu',
            role: 'super_admin',
            status: 'approved',
            lastLoginAt: Date.now()
          };
          await saveUsers(redis, users);
          return res.status(200).json({
            success: true,
            user: users[SUPER_ADMIN_EMAIL],
            allUsers: Object.values(users)
          });
        }

        // Existing user
        if (users[normEmail]) {
          const user = users[normEmail];
          if (user.status === 'blocked') {
            return res.status(403).json({
              success: false,
              blocked: true,
              error: 'Tài khoản đã bị từ chối hoặc bị xóa khỏi hệ thống. Vui lòng liên hệ Super Admin.'
            });
          }

          user.lastLoginAt = Date.now();
          if (name && !user.name) user.name = name;
          await saveUsers(redis, users);

          return res.status(200).json({
            success: true,
            user,
            pending: user.status === 'pending'
          });
        }

        // New user requesting access
        users[normEmail] = {
          email: normEmail,
          name: name || normEmail.split('@')[0],
          role: 'viewer', // default role pending approval
          status: 'pending',
          requestedAt: Date.now(),
          lastLoginAt: Date.now()
        };
        await saveUsers(redis, users);

        return res.status(200).json({
          success: true,
          user: users[normEmail],
          pending: true,
          message: 'Yêu cầu đăng nhập đã được gửi tới Super Admin (Hoàng Đình Hiếu). Vui lòng đợi phê duyệt.'
        });
      }

      // STRICT SUPER ADMIN VERIFICATION FOR MANAGEMENT ACTIONS
      if (normRequester !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          error: 'Chỉ Super Admin (hoangdinhhieu1410@gmail.com) mới có quyền thực hiện thao tác này!'
        });
      }

      // ACTION 2: APPROVE USER
      if (action === 'approve') {
        if (!normTarget || !users[normTarget]) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản cần phê duyệt' });
        }

        const assignRole = (role === 'editor') ? 'editor' : 'viewer';
        users[normTarget] = {
          ...users[normTarget],
          status: 'approved',
          role: assignRole,
          approvedAt: Date.now(),
          approvedBy: SUPER_ADMIN_EMAIL
        };
        await saveUsers(redis, users);

        return res.status(200).json({
          success: true,
          message: `Đã phê duyệt tài khoản ${normTarget} với quyền "${assignRole === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}"`,
          allUsers: Object.values(users)
        });
      }

      // ACTION 3: CHANGE ROLE
      if (action === 'change_role') {
        if (!normTarget || !users[normTarget]) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
        }
        if (normTarget === SUPER_ADMIN_EMAIL) {
          return res.status(400).json({ success: false, error: 'Không thể thay đổi quyền của Super Admin' });
        }

        const assignRole = (role === 'editor') ? 'editor' : 'viewer';
        users[normTarget].role = assignRole;
        await saveUsers(redis, users);

        return res.status(200).json({
          success: true,
          message: `Đã cập nhật quyền của ${normTarget} thành "${assignRole === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}"`,
          allUsers: Object.values(users)
        });
      }

      // ACTION 4: DELETE EMAIL (REVOKE ACCESS IMMEDIATELY)
      if (action === 'delete') {
        if (!normTarget) {
          return res.status(400).json({ success: false, error: 'Thiếu email cần xóa' });
        }
        if (normTarget === SUPER_ADMIN_EMAIL) {
          return res.status(400).json({ success: false, error: 'Không thể xóa tài khoản Super Admin' });
        }

        delete users[normTarget];
        await saveUsers(redis, users);

        return res.status(200).json({
          success: true,
          message: `Đã xóa hoàn toàn email ${normTarget} khỏi hệ thống. Tài khoản này sẽ không thể đăng nhập vào Vercel!`,
          allUsers: Object.values(users)
        });
      }

      // ACTION 5: GET FULL LIST
      if (action === 'list') {
        return res.status(200).json({
          success: true,
          allUsers: Object.values(users)
        });
      }

      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
    }

    return res.status(405).json({ success: false, error: 'Phương thức không được hỗ trợ' });
  } catch (err) {
    console.error('API /api/auth-users error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
