---
name: thiep-cuoi-online
description: Hướng dẫn thiết kế, tùy biến, mở rộng và vận hành toàn diện hệ thống Thiệp Cưới Online sang trọng (Cocohappii, LoveCard 26, 27BigGroup A9, Save our date), quản lý khách mời riêng, hỗ trợ song song 2 nhà trai/gái, xuất file HTML độc lập và deploy Vercel/GitHub. Sử dụng khi người dùng muốn sửa đổi, bảo trì, tạo mẫu bìa mới hoặc triển khai thiệp cưới online.
---

# Thiệp Cưới Online - Wedding Invitation Studio Skill

Kỹ năng chuyên môn hóa để thiết kế, tinh chỉnh giao diện, phát triển tính năng và triển khai hệ thống Thiệp Cưới Online phong cách hoàng gia hiện đại.

## 1. Cấu Trúc Dự Án (Tech Stack)
* **Frontend Core**: React 18, Vite 6, Tailwind CSS 3.
* **Biểu Tượng**: Lucide React.
* **Phông Chữ Nghệ Thuật (Chuẩn Việt Hóa 100%)**:
  * `font-motherland`: NVN Motherland Signature (`public/fonts/nvn-motherland-signature.ttf`) - Dành riêng cho tên cặp đôi thư pháp, chữ ký lãng mạn, Save our date.
  * `font-avo`: UTM Avo (`public/fonts/utm-avo.ttf`) - Dành cho tiêu đề phụ, lời mời, tên khách, ngày cưới, nút bấm, hướng dẫn.
  * `font-serif-elegant`: Playfair Display / Cormorant Garamond.
* **File chính**:
  * `src/components/StudioEditor.jsx`: Trình quản trị studio thiết kế trực quan (soạn thảo nội dung, nhạc nền, khách mời, chọn bìa, hiệu ứng, màu sắc).
  * `src/components/GuestView.jsx`: Giao diện khách mời xem thiệp cưới hoàn chỉnh.
  * `src/components/EnvelopeModal.jsx`: Giao diện bìa phong bì và hiệu ứng mở bìa.
  * `src/data/weddingData.js`: Dữ liệu mặc định của nhà trai và nhà gái.

## 2. Các Mẫu Bìa Phong Bì (Envelope Cover Styles)
1. **Mẫu 1: Bìa Sáp Vàng Hoàng Gia (Cocohappii)**
   * Nền ảnh cưới kích thước lớn `h-[380px] sm:h-[440px]`, tiêu cự `object-[center_12%]`, hiển thị trọn vẹn khuôn mặt, nụ cười và khung cảnh.
   * Thẻ thiệp trắng vòm cung lồng ấn sáp vàng trái tim ở đỉnh vòm.
   * Tên cô dâu chú rể thư pháp hổ phách xếp tầng với cầu nối `—— & ——`.
   * Khung pill badge champagne chứa tên khách mời viết liền 1 dòng.
2. **Mẫu 2: Phong Bì Đỏ Hoa Tươi (LoveCard 26)**
   * Phong bì nhung 3D kết hoa tươi 2 góc đối xứng (`decor-flower-bouquet1.png`, `decor-flower-bouquet2.png`).
   * Tên cặp đôi thư pháp xếp tầng thoáng đãng, không đè chữ lên nhau.
3. **Mẫu 3: Cổng Xanh Ngọc & Cổng Vòm Cung Đình (27BigGroup A9)**
   * Nền xanh ngọc bích, cành trúc thanh tao, đường chỉ cổng đôi.
   * Khung cổng vòm cung đình rộng mở `h-[340px] sm:h-[390px]`, hiển thị 100% người và khung cảnh.
   * Ruy băng lụa đỏ và ấn triện đỏ chữ 囍 mạ vàng tương tác mở thiệp.
4. **Mẫu 4: Bìa Sáp Tối Giản (Save our date)**
   * Phong cách Hàn Quốc tối giản, chữ "Save our date" thư pháp liền mạch nằm bên trái đường chỉ.
   * Đường chỉ kẻ thẳng màu xanh phấn với khuy cúc ấn sáp đồng cành ô liu nằm đè chính giữa đường kẻ.
   * Nút bấm `MỞ THIỆP ›` bo tròn hiện đại.

## 3. Quy Trình Vận Hành & Tùy Biến
* **Chạy máy chủ dev**: `npm run dev -- --host 0.0.0.0` (cổng 5173).
* **Xuất bản HTML ngoại tuyến không cần mạng**:
  `npm run export` -> Tự động sinh `thiep-cuoi-offline.html` và `thiep-cuoi-final.html` (chứa toàn bộ CSS, JS, hình ảnh, phông chữ nhúng trực tiếp trong 1 file duy nhất ~770KB).
* **Cấu hình Public URL**:
  Nhập link Vercel vào tab *Cấu Hình Link Zalo/FB (OG)* và bấm *Lưu Thiệp*.
* **Quản lý khách mời**:
  Hệ thống tự động sinh link dạng: `https://<domain>/?side=groom&to=<TenKhach>` để khách mở thiệp có tên riêng.

## 4. Tài Liệu Tham Khảo Mở Rộng
* [Hướng dẫn các mẫu bìa & tham số](./references/templates-guide.md)
* [Hướng dẫn triển khai GitHub & Vercel](./references/deployment-guide.md)
* [Tiêu chuẩn phông chữ & dấu Tiếng Việt](./references/typography-guide.md)
