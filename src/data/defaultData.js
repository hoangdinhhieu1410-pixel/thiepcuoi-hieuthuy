export const DEFAULT_WEDDING_DATA = {
  profileType: 'groom',
  profileName: 'Thiệp Nhà Trai',
  // General & Styling (Cocohappii 007 Beige Palette)
  templateStyle: 'style4', // 'style1' (Wax seal cream), 'style2' (Red floral), 'style3' (Oriental gate), 'style4' (Save our date)
  primaryColor: '#70561f', // Antique gold / Bronze brown
  secondaryColor: '#928362',
  bgColor: '#faf7f2',

  // Couple Information (Hoàng Đình Hiếu ♥ Lê Thanh Thúy)
  groom: {
    name: 'Hoàng Đình Hiếu',
    nickname: 'Đình Hiếu',
    role: 'Chú rể',
    bio: 'Chàng trai luôn mỉm cười và nỗ lực hết mình vì gia đình nhỏ.',
    avatar: '/templates/007/images/groom.jpg',
    fatherTitle: 'Ông. ',
    father: 'Hoàng Văn Vinh',
    motherTitle: 'Bà. ',
    mother: 'Trần Thị Thuỳ',
    address: 'Thôn Cả, xã Sóc Sơn, TP. Hà Nội',
    phone: '0987654321',
  },
  bride: {
    name: 'Lê Thanh Thúy',
    nickname: 'Thanh Thúy',
    role: 'Cô dâu',
    bio: 'Cô gái dịu dàng, yêu thiên nhiên và là hậu phương ấm áp.',
    avatar: '/templates/007/images/bride.jpg',
    fatherTitle: 'Ông. ',
    father: 'Lê Anh Liên',
    motherTitle: 'Bà. ',
    mother: 'Trần Thị Lan',
    address: 'Sóc Sơn, TP. Hà Nội',
    phone: '0912345678',
  },

  // Main Wedding Event Details
  weddingDate: '2026-11-29T11:00:00',
  heroBannerPhoto: '/templates/007/images/hero_banner.jpg',
  timelineBgPhoto: '/templates/007/images/timeline_bg.jpg',
  timelineBgPhotoPosition: 'center 15%',
  footerBgPhoto: '/templates/007/images/footer_bg.jpg',

  // Section 2: Save the date
  saveTheDateText: 'Save the date',
  saveTheDateDay: '29.11.2026',
  saveTheDateFlowerSize: 112,
  parentGroomLabel: 'Nhà trai',
  parentBrideLabel: 'Nhà gái',
  groomTagLabel: 'Chú rể',
  brideTagLabel: 'Cô dâu',

  // Cấu hình Bìa Phong Bì (Cover Opening Styles)
  coverConfig: {
    activeStyle: 'style4',
    availableStyles: ['style1', 'style2', 'style3', 'style4'],
    coverAnimationEffect: 'waxFlap', // 'waxFlap' (Mở nắp sáp), 'splitDoor' (Mở cửa đôi), 'zoomFade' (Thu nhỏ điện ảnh), 'none' (Tĩnh)
    coverBgColor: '#faf7f2',
    style1: {
      id: 'style1',
      name: 'Mẫu 1: Bìa Sáp Vàng Hoàng Gia (Cocohappii)',
      subTitle: 'The Wedding Of',
      names: 'Đình Hiếu ♥ Thanh Thúy',
      date: '29.11.2026',
      greetingLabel: 'TRÂN TRỌNG KÍNH MỜI',
      buttonText: 'Xem thiệp ngay',
      photo: '/templates/007/images/cover_style1.jpg',
    },
    style2: {
      id: 'style2',
      name: 'Mẫu 2: Phong Bì Đỏ Hoa Tươi (LoveCard 26)',
      greetingLabel: 'TRÂN TRỌNG KÍNH MỜI',
      hintText: 'NHẤN VÀO THIỆP ĐỂ MỞ',
      names: 'Đình Hiếu - Thanh Thúy',
      subTitle: 'SAVE THE DATE',
      date: '29.11.2026',
      buttonText: 'Mở Thiệp Ngay',
    },
    style3: {
      id: 'style3',
      name: 'Mẫu 3: Cổng Xanh Ngọc & Ấn Triện (27BigGroup A9)',
      headerTitle: 'THIỆP MỜI CƯỚI',
      names: 'Đình Hiếu & Thanh Thúy',
      hintText: 'Chạm vào ấn đỏ để mở cánh cửa',
      greetingLabel: 'Trân trọng kính mời',
      buttonText: 'MỞ THIỆP',
      photo: '/templates/007/images/cover_style3.jpg',
    },
    style4: {
      id: 'style4',
      name: 'Mẫu 4: Bìa Sáp Tối Giản (Save our date)',
      headerTitle: 'Save our date',
      names: 'Đình Hiếu & Thanh Thúy',
      groomName: 'Đình Hiếu',
      brideName: 'Thanh Thúy',
      date: '29.11.2026',
      greetingLabel: 'Trân trọng kính mời',
      guestText: 'Quý khách',
      buttonText: 'MỞ THIỆP',
      bgColor: '#fbf5ed',
      ribbonColor: '#dbe5ee'
    }
  },

  // Hiển thị & ẩn các đầu mục trong thiệp
  sectionVisibility: {
    greeting: true,   // 1. Dòng chữ lời mời đầu thiệp
    events: true,     // 2 & 3. Sự kiện cưới (Tiệc cưới & Lễ thành hôn)
    calendar: true,   // Lịch cưới & Countdown
    timeline: true,   // 4. Mốc lịch trình tiệc cưới
    otherText: true,  // 5. Các dòng chữ tiêu đề khác
    gallery: true,    // Album ảnh cưới
    gift: true,       // Hộp mừng cưới
    comments: true    // Sổ lưu bút
  },

  // Các đầu mục tự tạo thêm
  customSections: [],

  // Chuyển cảnh & hiệu ứng cho Ruột thiệp
  photoAnimationEffect: 'kenburns', // 'kenburns' (Điện ảnh), 'fadeScale' (Mờ ảo hiện dần), 'float3D' (Nổi 3D lướt nhẹ), 'none' (Tĩnh)
  textAnimationEffect: 'slideUp',   // 'slideUp' (Lướt lên mềm mại), 'blurFade' (Mờ ảo sương khói), 'shimmer' (Lấp lánh thư pháp), 'none' (Tĩnh)

  // Section 3: Invitation Greeting (Ảnh 1 người dùng gửi)
  invitationGreeting: 'Trân trọng kính mời',
  invitationSub: 'đến tham dự lễ cưới của',

  // Section 3: Events & Schedules (Ảnh 1 & Ảnh 2 người dùng gửi)
  events: [
    {
      id: 'tiec-cuoi-nha-trai',
      title: 'TIỆC CƯỚI NHÀ TRAI',
      time: '16 GIỜ',
      date: '28',
      month: 'Tháng 11',
      year: 'Năm 2026',
      dayOfWeek: 'Thứ Bảy',
      lunarDate: '(Tức ngày 20 tháng 10 năm Bính Ngọ)',
      venue: 'Tại Nhà văn hoá thôn Cả',
      address: 'Địa chỉ: xã Sóc Sơn - Tp. Hà Nội',
      mapBtnText: 'Chỉ đường',
      mapUrl: 'https://maps.app.goo.gl/FLPnuCHv3DFVGGVS9',
    },
    {
      id: 'le-thanh-hon',
      title: 'LỄ THÀNH HÔN',
      time: '11 GIỜ',
      date: '29',
      month: 'Tháng 11',
      year: 'Năm 2026',
      dayOfWeek: 'Chủ Nhật',
      lunarDate: '(Tức ngày 21 tháng 10 năm Bính Ngọ)',
      venue: 'Tại Tư gia nhà trai',
      address: 'Địa chỉ: Thôn Cả - xã Sóc Sơn - Tp. Hà Nội',
      mapBtnText: 'Chỉ đường',
      mapUrl: 'https://maps.google.com/?q=Sóc+Sơn+Hà+Nội',
    }
  ],

  // Section 4: Mini Calendar
  calendarYear: '2026',
  calendarMonth: 'November',

  // Section 5: Timeline (Ảnh 3 người dùng gửi)
  timelineHeading: 'Timeline',
  timeline: [
    {
      id: 'tl-1',
      time: '15:00',
      date: 'NGÀY 28.11.2026',
      title: 'ĐÓN KHÁCH',
      icon: '/templates/007/images/icon-tl1.png',
      flower: '/templates/007/images/timeline-flower.png'
    },
    {
      id: 'tl-2',
      time: '16:00',
      date: 'NGÀY 28.11.2026',
      title: 'KHAI TIỆC',
      icon: '/templates/007/images/icon-tl2.png',
      flower: '/templates/007/images/timeline-flower.png'
    }
  ],

  // Section 6: Photo Album Gallery (Our Memories)
  galleryHeading: 'Our Memories',
  gallery: [
    { id: 'g1', url: '/templates/007/images/gallery_1.jpg', caption: 'Khoảnh khắc ngọt ngào' },
    { id: 'g2', url: '/templates/007/images/gallery_2.jpg', caption: 'Nụ cười hạnh phúc' },
    { id: 'g3', url: '/templates/007/images/gallery_3.jpg', caption: 'Bên anh là bình yên' },
    { id: 'g4', url: '/templates/007/images/gallery_4.jpg', caption: 'Lời hẹn ước trăm năm' },
    { id: 'g5', url: '/templates/007/images/gallery_5.jpg', caption: 'Chạm tay vào hạnh phúc' },
    { id: 'g6', url: '/templates/007/images/gallery_6.jpg', caption: 'Ánh mắt người thương' }
  ],
  galleryEffect: 'kenburns',

  // Section 7: Gift Box (Hộp mừng cưới)
  giftHeading: 'Hộp mừng cưới',
  giftSubtitle: 'Cảm ơn tình cảm của mọi người đã dành cho chúng mình!',
  giftButtonLabel: 'Mở Hộp Mừng Cưới',
  banking: {
    groomBank: {
      bankId: 'MB',
      bankName: 'MBBank (Quân Đội)',
      accountNo: '99999988888',
      accountName: 'HOANG DINH HIEU',
      branch: 'Hà Nội',
      qrImage: '',
    },
    brideBank: {
      bankId: 'TCB',
      bankName: 'Techcombank',
      accountNo: '19033336666',
      accountName: 'LE THANH THUY',
      branch: 'Hà Nội',
      qrImage: '',
    }
  },

  // Section 8: Sổ lưu bút & Countdown
  commentsHeading: 'Sổ lưu bút',
  commentsSubtitle: 'Cảm ơn bạn rất nhiều vì đã gửi những lời chúc mừng tốt đẹp nhất đến đám cưới của chúng tôi!',
  submitWishButtonText: 'Gửi Lời Chúc',
  countdownHeading: 'Countdown',
  countdownLabels: {
    days: 'Ngày',
    hours: 'Giờ',
    minutes: 'Phút',
    seconds: 'Giây'
  },

  // Section 9: Footer
  footerThankYou: 'Rất hân hạnh được đón tiếp!',
  footerSignature: 'Hiếu + Thúy',

  // Background Music
  music: {
    enabled: true,
    autoplayOnOpen: true,
    activeTrackId: 'track_dalab',
    customTrackUrl: '/templates/007/music.m4a',
    customTrackName: 'Da LAB - Một Nhà',
    presetTracks: [
      {
        id: 'track_dalab',
        title: 'Da LAB - Một Nhà',
        artist: 'Da LAB',
        url: '/templates/007/music.m4a'
      },
      {
        id: 'track_11',
        title: 'Yêu Em Thì Gạt Đầu (Remix)',
        artist: 'Nhạc Hot TikTok',
        url: '/templates/007/tracks/track_11.m4a'
      },
      {
        id: 'track_2',
        title: 'Rước Tình Về Với Quê Hương (Bản Hot TikTok) - H2K',
        artist: 'H2K',
        url: '/templates/007/tracks/track_2.m4a'
      },
      {
        id: 'preset-1',
        title: 'Beautiful in White (Piano)',
        artist: 'Shane Filan Style',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_c976ccb635.mp3?filename=romantic-piano-112199.mp3'
      }
    ]
  },

  // Social Share & OpenGraph Preview
  socialShare: {
    title: 'Thư mời cưới Đình Hiếu ♥ Thanh Thúy',
    description: 'Thiệp cưới online của Đình Hiếu ♥ Thanh Thúy nơi gửi gắm lời mời trân trọng và câu chuyện tình yêu đong đầy ý nghĩa.',
    thumbnail: '/templates/007/images/cover_social.jpg',
    slug: 'dinhhieu-thanhthuy-wedding',
    customDomain: 'https://thiepcuoi-hieuthuy-web.vercel.app'
  },

  // Guest Management
  guests: [
    {
      id: 'guest-1',
      name: 'Bạn và Người Thương',
      salutation: 'Trân trọng kính mời',
      group: 'Bạn học',
      invitedSide: 'Nhà Trai'
    },
    {
      id: 'guest-2',
      name: 'Anh Nam và Gia Đình',
      salutation: 'Trân trọng kính mời',
      group: 'Đồng nghiệp',
      invitedSide: 'Nhà Trai'
    },
    {
      id: 'guest-3',
      name: 'Chị Mai Lan',
      salutation: 'Thân mời',
      group: 'Bạn xã hội',
      invitedSide: 'Nhà Gái'
    }
  ],

  // Preloaded Wishes
  wishes: [
    {
      id: 'w1',
      name: 'Tuấn Anh & Thu Trang',
      relationship: 'Bạn thân chú rể (Tham dự 2 người)',
      message: 'Chúc mừng Đình Hiếu & Thanh Thúy trăm năm hạnh phúc! Hôn lễ tuyệt vời!',
      createdAt: 'Vừa xong'
    },
    {
      id: 'w2',
      name: 'Minh Hằng',
      relationship: 'Đồng nghiệp cô dâu (Tham dự 1 người)',
      message: 'Chúc cô dâu Thanh Thúy mãi rạng rỡ và hạnh phúc trọn vẹn bên chú rể!',
      createdAt: '1 giờ trước'
    }
  ]
};

// Mẫu 2: Thiệp Dành Cho Nhà Gái (Tiệc Cưới Nhà Gái / Lễ Vu Quy)
export const DEFAULT_BRIDE_WEDDING_DATA = {
  ...DEFAULT_WEDDING_DATA,
  profileType: 'bride',
  profileName: 'Thiệp Nhà Gái',
  saveTheDateDay: '29.11.2026',
  parentGroomLabel: 'Nhà trai',
  parentBrideLabel: 'Nhà gái',
  groomTagLabel: 'Chú rể',
  brideTagLabel: 'Cô dâu',
  invitationGreeting: 'Trân trọng kính mời',
  invitationSub: 'đến tham dự lễ cưới của',
  coverConfig: {
    ...DEFAULT_WEDDING_DATA.coverConfig,
    style1: {
      ...DEFAULT_WEDDING_DATA.coverConfig.style1,
      names: 'Thanh Thúy ♥ Đình Hiếu',
      date: '29.11.2026',
    },
    style2: {
      ...DEFAULT_WEDDING_DATA.coverConfig.style2,
      names: 'Thanh Thúy - Đình Hiếu',
      date: '29.11.2026',
    },
    style3: {
      ...DEFAULT_WEDDING_DATA.coverConfig.style3,
      names: 'Thanh Thúy & Đình Hiếu',
      date: '29.11.2026',
    },
    style4: {
      ...DEFAULT_WEDDING_DATA.coverConfig.style4,
      names: 'Thanh Thúy & Đình Hiếu',
      groomName: 'Thanh Thúy',
      brideName: 'Đình Hiếu',
      date: '29.11.2026',
    }
  },
  events: [
    {
      id: 'tiec-cuoi-nha-gai',
      title: 'TIỆC CƯỚI NHÀ GÁI',
      time: '11 GIỜ',
      date: '28',
      month: 'Tháng 11',
      year: 'Năm 2026',
      dayOfWeek: 'Thứ Bảy',
      lunarDate: '(Tức ngày 20 tháng 10 năm Bính Ngọ)',
      venue: 'Tại Tư gia nhà gái',
      address: 'Địa chỉ: Xã Sóc Sơn - TP. Hà Nội',
      mapBtnText: 'Chỉ đường',
      mapUrl: 'https://maps.google.com/?q=Sóc+Sơn+Hà+Nội',
    },
    {
      id: 'le-vu-quy',
      title: 'LỄ VU QUY',
      time: '09 GIỜ',
      date: '29',
      month: 'Tháng 11',
      year: 'Năm 2026',
      dayOfWeek: 'Chủ Nhật',
      lunarDate: '(Tức ngày 21 tháng 10 năm Bính Ngọ)',
      venue: 'Tại Tư gia nhà gái',
      address: 'Địa chỉ: Xã Sóc Sơn - TP. Hà Nội',
      mapBtnText: 'Chỉ đường',
      mapUrl: 'https://maps.google.com/?q=Sóc+Sơn+Hà+Nội',
    }
  ],
  timelineHeading: 'Timeline',
  timeline: [
    {
      id: 'tl-1',
      time: '10:30',
      date: 'NGÀY 28.11.2026',
      title: 'ĐÓN KHÁCH NHÀ GÁI',
      icon: '/templates/007/images/icon-tl1.png',
      flower: '/templates/007/images/timeline-flower.png'
    },
    {
      id: 'tl-2',
      time: '11:30',
      date: 'NGÀY 28.11.2026',
      title: 'KHAI TIỆC MỪNG VU QUY',
      icon: '/templates/007/images/icon-tl2.png',
      flower: '/templates/007/images/timeline-flower.png'
    }
  ],
  socialShare: {
    title: 'Thư mời cưới Thanh Thúy ♥ Đình Hiếu (Nhà Gái)',
    description: 'Trân trọng kính mời quý khách đến chung vui lễ thành hôn của Thanh Thúy & Đình Hiếu.',
    thumbnail: '/templates/007/images/cover_social.jpg',
    slug: 'le-vu-quy-thanhthuy-dinhhieu',
    customDomain: 'https://thiepcuoi-hieuthuy-web.vercel.app'
  }
};
