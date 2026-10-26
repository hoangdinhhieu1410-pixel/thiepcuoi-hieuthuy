# ỨNG DỤNG THIẾT KẾ & PHÁT HÀNH THIỆP CƯỚI ONLINE (WEB APP & STUDIO)

Dự án thiệp cưới online tương tác cao, hỗ trợ chạy offline hoàn toàn trên máy tính cá nhân, gửi file trực tiếp cho bạn bè mở được ngay không cần cài đặt, và sẵn sàng triển khai trực tuyến miễn phí.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Trải Nghiệm Mở Thiệp Độc Đáo (Cover & Opening Screen)
- Hỗ trợ đổi qua lại giữa **3 mẫu bìa phong bì**:
  - **Mẫu 1 (Sáp Vàng):** Phong bì kem trang nhã với con dấu sáp vàng tròn (Ảnh 1).
  - **Mẫu 2 (Hoa Đỏ):** Phong bì đỏ truyền thống sang trọng kết hợp hoa cưới (Ảnh 2).
  - **Mẫu 3 (Cổng Xanh):** Cổng cưới phương Đông vintage, ấn triện tròn lồng ảnh đôi lứa (Ảnh 3).
- Hiệu ứng chạm mở phong bì mượt mà, tự động kích hoạt bài hát cưới du dương.
- Trình phát nhạc nổi (Floating Vinyl Player) đĩa than quay tròn, cho phép bật/tắt nhạc bất cứ lúc nào.

### 2. Quản Lý Nhạc Nền (Preset & Upload MP3)
- Thư viện các bản nhạc cưới không lời lãng mạn cài sẵn (tick chọn để đổi bài ngay).
- **Tải lên file MP3 từ máy tính:** Tự động nạp bài hát bạn yêu thích vào thiệp để phát offline.

### 3. Quản Lý Khách Mời & Sinh Link Cá Nhân Hóa (Yêu cầu số 5)
- Danh bạ khách mời lưu trực tiếp trên máy (không sợ mất khi F5).
- Tự động sinh link riêng cho từng người (vd: `thiepcuoi.html?to=Anh+Nam&guest=Đồng+Nghiệp`).
- Khi khách mở link, trên bìa thiệp sẽ hiển thị trang trọng: *"Trân trọng kính mời: Anh Nam"*.
- Nút **1-Click Copy Link** để gửi nhanh qua Zalo, Messenger hoặc SMS.

### 4. Cấu Hình & Mô Phỏng Social Share Link Zalo / Facebook (Yêu cầu số 6 - Ảnh 4)
- Chỉnh sửa `og:title`, `og:description`, `og:image` (ảnh thumbnail).
- **Khung mô phỏng trực quan Live Preview:** Hiển thị chính xác thẻ link khi gửi trên Zalo/Messenger giống hệt hình ảnh số 4.

### 5. Gửi File Mở Ra Xem Bình Thường (Yêu cầu số 2)
- Tích hợp công nghệ **Single-File HTML Bundle**: Đóng gói toàn bộ code, ảnh, font chữ, âm thanh vào **duy nhất 1 file `thiep-cuoi-offline.html`**.
- Bạn chỉ việc gửi file này qua Zalo/Drive, người nhận click đúp là mở ra xem thiệp đầy đủ mà không cần internet hay máy chủ.

### 6. Đầy Đủ Các Phân Mục Tiêu Chuẩn (Cocohappii Style)
- Đếm ngược ngày cưới (Countdown Timer).
- Chân dung Cô dâu - Chú rể & Lời ngỏ.
- Lịch trình sự kiện (Lễ Vu Quy, Lễ Thành Hôn, Tiệc Cưới) kèm nút Google Maps & Lưu lịch.
- Album ảnh cưới với hiệu ứng chuyển động **Ken Burns / Fade** bắt mắt.
- Hành trình yêu (Love Story timeline).
- Hộp mừng cưới online tích hợp mã **VietQR** tự động sinh theo STK ngân hàng.
- Sổ lưu bút & Form xác nhận tham dự (RSVP) kèm hiệu ứng pháo hoa chúc mừng.

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

### 1. Chạy Thử Trên Máy (Local Dev Server)
Ứng dụng đang chạy sẵn tại địa chỉ:
👉 **http://localhost:5173/**

*Để thử xem thiệp với tên khách mời:*
👉 **http://localhost:5173/?to=Anh%20Nam%20và%20Người%20Thương**

*Để mở trực tiếp Studio Chỉnh Sửa:*
👉 Bấm nút **"Vào Studio Chỉnh Sửa"** ở góc phải trên cùng màn hình, hoặc truy cập:
👉 **http://localhost:5173/?studio=true**

### 2. Xuất File Độc Lập Gửi Bạn Bè
Chạy lệnh sau trong thư mục dự án:
```bash
npm run export
```
File **`thiep-cuoi-offline.html`** sẽ được tạo ra ngay tại thư mục gốc. Bạn có thể gửi file này cho bạn bè qua Zalo hoặc copy vào USB mở ở bất kỳ máy tính/điện thoại nào.

### 3. Đưa Lên Trực Tuyến Miễn Phí (Để Có Link Đẹp Gửi Zalo/FB)
1. Chạy lệnh: `npm run build`
2. Kéo thả thư mục `dist` lên [Netlify Drop](https://app.netlify.com/drop) hoặc đẩy lên [Vercel](https://vercel.com).
3. Bạn sẽ có ngay đường link trực tuyến miễn phí vĩnh viễn với đầy đủ thẻ xem trước (Ảnh 4).
