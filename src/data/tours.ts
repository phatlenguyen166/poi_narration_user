import type { AppLanguage, Tour } from '../types'

const tr = (
  vi: string,
  en: string,
  zh: string = en,
  fr: string = en,
  ko: string = en
): Record<AppLanguage, string> => ({
  'vi-VN': vi,
  'en-US': en,
  'zh-CN': zh,
  'fr-FR': fr,
  'ko-KR': ko
})

export const TOURS: Tour[] = [
  {
    id: 'tour1',
    icon: '🏙️',
    estimatedMinutes: 180,
    poiIds: ['poi1', 'poi2', 'poi7', 'poi10'],
    name: tr('Điểm nổi bật thành phố', 'City Highlights'),
    description: tr(
      'Khám phá những biểu tượng nổi bật nhất của thành phố Hồ Chí Minh',
      'Explore the most iconic landmarks of Ho Chi Minh City'
    )
  },
  {
    id: 'tour2',
    icon: '🏛️',
    estimatedMinutes: 150,
    poiIds: ['poi3', 'poi5', 'poi6', 'poi9'],
    name: tr('Sài Gòn Lịch Sử', 'Historical Saigon'),
    description: tr(
      'Hành trình qua những di tích lịch sử và kiến trúc thời Pháp thuộc',
      'Journey through historical sites and French colonial architecture'
    )
  },
  {
    id: 'tour3',
    icon: '🛒',
    estimatedMinutes: 120,
    poiIds: ['poi2', 'poi4', 'poi8', 'poi9'],
    name: tr('Chợ & Văn hóa', 'Markets & Culture'),
    description: tr(
      'Trải nghiệm văn hóa chợ truyền thống và nghệ thuật biểu diễn Sài Gòn',
      "Experience traditional market culture and Saigon's performing arts"
    )
  }
]

export const getTourById = (id: string): Tour | undefined => TOURS.find((tour) => tour.id === id)
