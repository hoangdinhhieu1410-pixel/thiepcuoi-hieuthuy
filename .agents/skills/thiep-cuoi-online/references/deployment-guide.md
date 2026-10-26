# Hướng Dẫn Triển Khai GitHub & Vercel

## 1. Chuẩn Bị Git & Đẩy Lên GitHub
```bash
# Khởi tạo repository
git init

# Thêm tất cả file
git add .

# Tạo commit đầu tiên
git commit -m "feat: Hoan thien he thong thiep cuoi online sang trong"

# Đẩy lên GitHub qua GitHub CLI
gh repo create thiepcuoi-hieuthuy --public --source=. --push
```

## 2. Deploy Lên Vercel
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub `hoangdinhhieu1410-pixel`.
2. Bấm **"Add New..."** -> **"Project"**.
3. Chọn repository `thiepcuoi-hieuthuy` vừa đẩy lên.
4. Ở mục **Project Name**, đặt tên là: `thiepcuoi-hieuthuy`.
5. Bấm **Deploy**.
6. Sau khoảng 30 giây, Vercel sẽ cung cấp đường link: `https://thiepcuoi-hieuthuy.vercel.app`.
7. Dán link này vào ô *Tên miền / Link Web Thiệp Cưới Online (Public URL)* trong Studio và bấm *Lưu Thiệp*.
