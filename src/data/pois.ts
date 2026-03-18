import type { AppLanguage, Poi } from '../types'

const tr = (
  vi: string,
  en: string,
  zh: string = en,
  ja: string = en,
  fr: string = en,
  ko: string = en
): Record<AppLanguage, string> => ({
  'vi-VN': vi,
  'en-US': en,
  'zh-CN': zh,
  'ja-JP': ja,
  'fr-FR': fr,
  'ko-KR': ko
})

const same = (value: string): Record<AppLanguage, string> => ({
  'vi-VN': value,
  'en-US': value,
  'zh-CN': value,
  'ja-JP': value,
  'fr-FR': value,
  'ko-KR': value
})

export const POIS: Poi[] = [
  {
    id: 'poi1',
    name: tr('Landmark 81', 'Landmark 81'),
    description: tr(
      'Tòa nhà cao nhất Việt Nam với 81 tầng, biểu tượng của Sài Gòn hiện đại',
      'The tallest building in Vietnam with 81 floors, a modern symbol of Ho Chi Minh City'
    ),
    latitude: 10.7948,
    longitude: 106.7218,
    radius: 100,
    priority: 10,
    imageUrl: same('https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800'),
    category: 'Landmark'
  },
  {
    id: 'poi2',
    name: tr('Chợ Bến Thành', 'Ben Thanh Market'),
    description: tr(
      'Chợ truyền thống nổi tiếng, trung tâm mua sắm và ẩm thực Sài Gòn',
      'Famous traditional market, shopping and culinary center of Ho Chi Minh City'
    ),
    latitude: 10.7726,
    longitude: 106.698,
    radius: 80,
    priority: 9,
    imageUrl: same('https://images.unsplash.com/photo-1528127269322-539801943592?w=800'),
    category: 'Market'
  },
  {
    id: 'poi3',
    name: tr('Nhà Thờ Đức Bà', 'Notre Dame Cathedral'),
    description: tr(
      'Nhà thờ mang phong cách kiến trúc Pháp, biểu tượng lịch sử của trung tâm thành phố',
      'Catholic cathedral with French architectural style, a historical icon'
    ),
    latitude: 10.7798,
    longitude: 106.6991,
    radius: 70,
    priority: 9,
    imageUrl: same('https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800'),
    category: 'Historical'
  },
  {
    id: 'poi4',
    name: tr('Nhà Hát Thành Phố', 'Ho Chi Minh City Opera House'),
    description: tr(
      'Nhà hát với kiến trúc Pháp cổ điển, trung tâm nghệ thuật biểu diễn',
      'Opera house with classic French architecture, performing arts center'
    ),
    latitude: 10.7769,
    longitude: 106.7034,
    radius: 60,
    priority: 8,
    imageUrl: same('https://images.unsplash.com/photo-1580874895923-0d598c6f3c41?w=800'),
    category: 'Cultural'
  },
  {
    id: 'poi5',
    name: tr('Bưu Điện Trung Tâm', 'Central Post Office'),
    description: tr(
      'Bưu điện cổ điển nổi tiếng với kiến trúc Pháp đầu thế kỷ 20',
      'Historic central post office with early 20th century French architecture'
    ),
    latitude: 10.7798,
    longitude: 106.6996,
    radius: 50,
    priority: 8,
    imageUrl: same('https://images.unsplash.com/photo-1612892483236-52d32a0e0ac1?w=800'),
    category: 'Historical'
  },
  {
    id: 'poi6',
    name: tr('Dinh Độc Lập', 'Independence Palace'),
    description: tr(
      'Công trình lịch sử quan trọng, nơi diễn ra sự kiện kết thúc chiến tranh',
      'Important historical site, location of the event that ended the war'
    ),
    latitude: 10.7769,
    longitude: 106.6955,
    radius: 90,
    priority: 9,
    imageUrl: same('https://images.unsplash.com/photo-1540259662-e82f3ef6b81c?w=800'),
    category: 'Historical'
  },
  {
    id: 'poi7',
    name: tr('Phố Đi Bộ Nguyễn Huệ', 'Nguyen Hue Walking Street'),
    description: tr(
      'Không gian văn hóa đi bộ sầm uất, điểm hẹn giới trẻ Sài Gòn',
      'Bustling pedestrian cultural space, popular meeting spot for Saigon youth'
    ),
    latitude: 10.7743,
    longitude: 106.7019,
    radius: 120,
    priority: 7,
    imageUrl: same('https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=800'),
    category: 'Entertainment'
  },
  {
    id: 'poi8',
    name: tr('Chợ Bình Tây', 'Chinatown Market'),
    description: tr(
      'Chợ lớn tại khu Chợ Lớn, nơi mua sắm đặc sản và hàng hóa giá tốt',
      'Large Chinatown market, known for souvenirs and affordable goods'
    ),
    latitude: 10.7525,
    longitude: 106.6515,
    radius: 100,
    priority: 7,
    imageUrl: same('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'),
    category: 'Market'
  },
  {
    id: 'poi9',
    name: tr('Bảo Tàng Chứng Tích Chiến Tranh', 'War Remnants Museum'),
    description: tr(
      'Bảo tàng lưu giữ nhiều hiện vật và tư liệu về chiến tranh Việt Nam',
      'Museum preserving artifacts and evidence of the Vietnam War'
    ),
    latitude: 10.7794,
    longitude: 106.692,
    radius: 70,
    priority: 8,
    imageUrl: same('https://images.unsplash.com/photo-1565531669785-2d793a9a0a15?w=800'),
    category: 'Museum'
  },
  {
    id: 'poi10',
    name: tr('Bến Nhà Rồng', 'Nha Rong Wharf'),
    description: tr(
      'Di tích lịch sử quan trọng gắn với hành trình cứu nước của Chủ tịch Hồ Chí Minh',
      'Historical wharf associated with Ho Chi Minh historical journey'
    ),
    latitude: 10.7665,
    longitude: 106.7073,
    radius: 80,
    priority: 8,
    imageUrl: same('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800'),
    category: 'Historical'
  }
]

export const getPoiById = (id: string): Poi | undefined => POIS.find((poi) => poi.id === id)
