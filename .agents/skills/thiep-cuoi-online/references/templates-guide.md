# Hướng Dẫn Tùy Biến Bìa & Giao Diện Thiệp Cưới

Tài liệu chi tiết cấu trúc dữ liệu `coverConfig` và các tham số điều khiển giao diện:

## 1. Cấu Trúc Dữ Liệu `coverConfig`
```javascript
coverConfig: {
  activeStyle: 'style1', // 'style1' | 'style2' | 'style3' | 'style4'
  showCoverFirst: false, // true: Hiện bìa trước khi vào ruột | false: Vào thẳng ruột thiệp
  coverBgColor: '#1c1917', // Màu nền tổng thể phong bì
  coverAnimationEffect: 'waxFlap', // 'waxFlap' | 'splitDoor' | 'flowerBloom' | 'zoomFade' | ...
  style1: {
    photo: '/templates/007/images/hero_banner.jpg',
    subTitle: 'THE WEDDING OF',
    names: 'Đình Hiếu ♥ Thanh Thúy',
    date: '28.11.2026',
    greetingLabel: 'TRÂN TRỌNG KÍNH MỜI',
    buttonText: 'Xem thiệp ngay'
  },
  style2: {
    greetingLabel: 'TRÂN TRỌNG KÍNH MỜI',
    hintText: 'NHẤN VÀO THIỆP ĐỂ MỞ',
    names: 'Đình Hiếu - Thanh Thúy',
    subTitle: 'SAVE THE DATE',
    date: '28.11.2026'
  },
  style3: {
    headerTitle: 'THIỆP MỜI CƯỚI',
    photo: '/templates/007/images/hero_banner.jpg',
    hintText: 'Chạm vào ấn đỏ để mở cánh cửa',
    greetingLabel: 'TRÂN TRỌNG KÍNH MỜI',
    names: 'Đình Hiếu & Thanh Thúy',
    buttonText: 'MỞ THIỆP'
  },
  style4: {
    groomName: 'Đình Hiếu',
    brideName: 'Thanh Thúy',
    buttonText: 'MỞ THIỆP',
    greetingLabel: 'Trân trọng kính mời',
    guestText: 'Quý khách'
  }
}
```

## 2. Các Hiệu Ứng Mở Bìa 3D
* `waxFlap`: Mở nắp sáp hoàng gia 3D (xoay mở nắp phong bì).
* `splitDoor`: Cổng đôi cung đình mở sang 2 bên (27BigGroup A9).
* `flowerBloom`: Cánh hoa tươi rơi bung nở rực rỡ (LoveCard 26).
* `ribbonUntie`: Tháo dải ruy băng lụa vàng kim.
* `curtainReveal`: Kéo rèm nhung đỏ sân khấu.
* `scrollUnroll`: Trải cuộn chiếu chỉ hỷ sự hoàng cung.
* `zoomFade`: Phóng to điện ảnh Hollywood điện ảnh.
