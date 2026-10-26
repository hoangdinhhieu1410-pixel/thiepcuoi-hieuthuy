# Tiêu Chuẩn Phông Chữ & Dấu Tiếng Việt

Hệ thống thiệp cưới yêu cầu tính thẩm mỹ cao và tuyệt đối không được lỗi dấu tiếng Việt:

## 1. Phông Chữ Thư Pháp: NVN Motherland Signature
* **Class**: `font-motherland`
* **File**: `public/fonts/nvn-motherland-signature.ttf`
* **Ứng dụng**:
  * Tên cô dâu và chú rể trên bìa thiệp cưới.
  * Tiêu đề chữ ký nghệ thuật "Save our date".
  * Tên khách mời thư pháp trên phong bì đỏ (Style 2).
* **Lưu ý thiết kế**:
  * Chữ có nét uốn lượn rộng (flourishes/swashes), nên khi hiển thị tên cặp đôi, ưu tiên xếp tầng (stacked) với cầu nối `—— & ——` ở giữa để tránh bị tràn lề màn hình điện thoại.
  * Phông đã được Việt hóa 100%, hỗ trợ hoàn hảo các ký tự khó: `ế`, `ề`, `ú`, `ý`, `Đ`, `ấ`.

## 2. Phông Chữ Nội Dung: UTM Avo
* **Class**: `font-avo`
* **File**: `public/fonts/utm-avo.ttf`
* **Ứng dụng**:
  * Tiêu đề phụ: `THE WEDDING OF`, `THIỆP MỜI CƯỚI`.
  * Lời mời: `TRÂN TRỌNG KÍNH MỜI`.
  * Khung pill badge khách mời: `Quý Khách và Người Thương`.
  * Hướng dẫn: `Chạm vào ấn đỏ để mở cánh cửa`.
  * Nút bấm: `Xem thiệp ngay`, `MỞ THIỆP`.
* **Lưu ý thiết kế**:
  * Luôn sử dụng kèm thuộc tính `whitespace-nowrap overflow-hidden text-ellipsis` để đảm bảo văn bản luôn nằm trên 1 dòng duy nhất.
