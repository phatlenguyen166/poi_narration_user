# FILE 1 — Tài liệu chi tiết source `poi_narration_mobile` (phục vụ migrate sang React Web)

## 1) Mục tiêu tài liệu

Tài liệu này tổng hợp **chi tiết toàn bộ phần nghiệp vụ/kiến trúc đang có** trong `D:\seminar\poi_narration_mobile` để làm blueprint chuyển đổi sang web (`poi_narration_user`) bằng React, giao diện mobile-first responsive.

---

## 2) Tổng quan project Flutter hiện tại

### 2.1 Cấu trúc thư mục chính

- `lib/`
  - `main.dart`, `app.dart`
  - `config/` (mode, theme, language, translations, constants)
  - `core/utils/` (distance calculator, smooth route)
  - `data/models/` (`POIModel`, `TourModel`, `UserModel`)
  - `data/repositories/` (`POIRepository`, `TourRepository`)
  - `services/` (auth, prefs, language, location, geofence, audio, narration)
  - `features/`
    - `auth/` (`login_screen`, `register_screen`)
    - `welcome/`
    - `tour_selection/`
    - `home/` (screen, controller, widgets map/search/audio)
    - `poi_detail/`
    - `poi_list/`
    - `settings/`
- `assets/audio/` (audio narration theo POI + ngôn ngữ)
- `.env` (Google Maps key)
- `pubspec.yaml` (dependencies + assets)

### 2.2 Stack Flutter hiện tại

- UI: Flutter Material 3
- Map: `google_maps_flutter`
- Location: `geolocator`, `permission_handler`
- Audio/TTS: `just_audio`, `flutter_tts`
- Auth social: `google_sign_in` (đang có nhưng flow login hiện dùng dev bypass)
- Storage local: `shared_preferences`
- Env: `flutter_dotenv`

---

## 3) Luồng khởi động và điều hướng

## 3.1 `main.dart`

1. `WidgetsFlutterBinding.ensureInitialized()`
2. Load `.env`
3. Init `AppPreferences`
4. Đọc ngôn ngữ từ preferences
5. Có logic ép mặc định sang English nếu đang là Vietnamese (theo code hiện tại)
6. Set vào `LanguageService`
7. `runApp(MyApp())`

## 3.2 `app.dart` (Auth guard + initial screen)

`_getInitialScreen()`:

1. `AuthService().initialize()` từ persisted state
2. Nếu chưa login -> `LoginScreen`
3. Nếu first launch -> `WelcomeScreen`
4. Nếu mode travel:
   - có active tour hợp lệ -> `HomeScreen(appMode: travel, activeTour)`
   - không có -> `TourSelectionScreen`
5. Nếu mode explore -> `HomeScreen(appMode: explore)`

`MaterialApp` dùng route `'/'` với `FutureBuilder`:

- Loading -> splash screen
- Error -> error screen
- Success -> màn hình tương ứng

---

## 4) Cấu hình cốt lõi (`config/`)

## 4.1 `AppMode`

- `travel`: bật tracking GPS + geofence auto narration
- `explore`: khám phá tự do, không tracking tự động

## 4.2 `AppLanguage`

Ngôn ngữ hỗ trợ:

- `vi-VN`, `en-US`, `ja-JP`, `zh-CN`, `ko-KR`, `fr-FR`

Mỗi language có:

- `code`
- `displayName`
- `flag`

## 4.3 `AppTranslations`

- Bản dịch theo map `Map<langCode, Map<key, value>>`
- Fallback: language hiện tại -> `en-US` -> chính key
- Nhóm key chính:
  - App chung
  - Home/Search/POI
  - Settings
  - Welcome + Mode
  - Tour selection
  - Auth (login/register/errors/password...)

## 4.4 `AppConstants`

- `cooldownSeconds = 30`
- `defaultPOIRadius = 50`
- Tracking thresholds:
  - `highAccuracyDistance = 20`
  - `normalAccuracyDistance = 100`
- Map zoom:
  - default `16`
  - focused `18`
- TTS defaults:
  - language `vi-VN`
  - speechRate `0.45`
  - volume `1.0`
  - pitch `1.0`

## 4.5 `AppTheme`

- Dark-themed color scheme (Material 3)
- Primary: Orange (`#FF6D00`)
- Custom card/button/appbar styles + Cupertino transitions

---

## 5) Models dữ liệu (`data/models`)

## 5.1 `POIModel`

Fields:

- `id`
- `name: Map<langCode, text>`
- `description: Map<langCode, text>`
- `position: LatLng`
- `radius: double`
- `priority: int`
- `imageUrl?: Map<langCode, url>`
- `category?: string`

Methods:

- `getName()`, `getDescription()`, `getImageUrl()` theo language hiện tại
- `getAudioPath()` theo pattern: `assets/audio/{id}_{langCode}.mp3`
- `toJson()`, `fromJson()`, `copyWith()`

## 5.2 `TourModel`

Fields:

- `id`
- `name` đa ngôn ngữ
- `description` đa ngôn ngữ
- `poiIds: string[]`
- `icon`
- `estimatedMinutes`

Methods:

- `getName()`, `getDescription()` theo language hiện tại
- `toJson()/fromJson()`

## 5.3 `UserModel`

Fields:

- `id`, `name`, `email`
- `phone?`, `photoUrl?`, `dateOfBirth?`, `gender?`
- `createdAt`

Methods:

- `copyWith()`
- `toJson()/fromJson()`
- `toJsonString()/fromJsonString()`

---

## 6) Repository dữ liệu hiện tại

## 6.1 `POIRepository`

Nguồn dữ liệu: hardcoded local list.

- Có 10 POI tại TP.HCM:
  - poi1 Landmark 81
  - poi2 Ben Thanh Market
  - poi3 Notre Dame Cathedral
  - poi4 Opera House
  - poi5 Central Post Office
  - poi6 Independence Palace
  - poi7 Nguyen Hue Walking Street
  - poi8 Chinatown Market
  - poi9 War Remnants Museum
  - poi10 Nha Rong Wharf

Hỗ trợ:

- `getAllPOIs()`
- `getPOIById()`
- `getPOIsByCategory()`
- `getPOIsSortedByPriority()`

## 6.2 `TourRepository`

Nguồn dữ liệu: hardcoded local list.

- 3 tour:
  - `tour1` City Highlights
  - `tour2` Historical Saigon
  - `tour3` Markets & Culture

Hỗ trợ:

- `getAllTours()`
- `getTourById()`
- `getPOIsForTour(tourId, poiRepo)`

---

## 7) Services (business logic)

## 7.1 `AppPreferences` (SharedPreferences wrapper)

Keys:

- `app_mode`
- `first_launch`
- `background_mode`
- `app_language`
- `active_tour_id`
- `is_logged_in`
- `user_json`
- `user_accounts` (map email -> `{ user, password }`)

Hỗ trợ:

- CRUD mode/language/background/active tour
- auth persistence
- `clear()`

## 7.2 `LanguageService` (singleton + ChangeNotifier)

- Lưu language hiện tại
- `setLanguage()`, `setLanguageByCode()`
- emit `notifyListeners()`

## 7.3 `AuthService` (local-first offline auth)

State:

- `_currentUser`
- `_isLoading`

Main APIs:

- `initialize()`
- `signInWithEmail(email, password)` (đọc account map local)
- `registerUser(...)` (lưu account local + auto login)
- `signInWithGoogle()` (có code, phụ thuộc config platform)
- `signOut()`
- `devSignIn()` (bypass cho demo/dev)

Lưu ý quan trọng:

- `LoginScreen` hiện tại gọi `devSignIn()` thay vì flow auth thật.

## 7.4 `AudioService` (singleton, dùng `just_audio`)

- Chỉ phát một audio toàn app
- APIs:
  - `playAsset()`, `loadAsset()`
  - `play()`, `pause()`, `resume()`, `stop()`, `seek()`
- Expose streams:
  - `positionStream`, `durationStream`, `playerStateStream`

## 7.5 `NarrationService` (`flutter_tts`)

- TTS init + callbacks progress/completion/error
- `speak`, `pause`, `resume`, `stop`, `seekTo`
- Cho test voice và text narration

## 7.6 `LocationService` (`geolocator`)

- Request permission foreground/background
- Start/stop stream tracking
- `getCurrentLocation()`
- Adaptive `TrackingMode`: `high`, `normal`, `low`
- Settings theo mode/platform + foreground/background config

## 7.7 `GeofenceService`

- `findNearbyPOI(userPos, pois)`:
  - trong radius
  - ưu tiên `priority` cao hơn
  - nếu bằng priority thì chọn khoảng cách gần hơn
- `findAllNearbyPOIs`
- `getDistanceToNearestPOI`
- `isEnteringGeofence(current, previous, poi)`

---

## 8) Logic Home cốt lõi (`HomeController`)

Responsibilities:

- Load POIs (toàn bộ hoặc filter theo tour trong travel mode)
- Quản lý map controller, user location
- Quản lý background mode + permission state
- Xử lý update mode explore/travel
- Trong travel mode:
  - tracking GPS
  - check geofence
  - trigger audio narration theo cooldown
  - auto adjust tracking mode theo distance

Rules:

- Cooldown narration cùng POI: `> 30s`
- Chuyển `explore -> travel`: start tracking
- Chuyển `travel -> explore`: stop tracking
- Marker user + marker POI + circle radius đều render trên map

---

## 9) Màn hình và UX hiện có (`features/`)

## 9.1 Auth

### Login

- Form email/password UI đầy đủ
- Nút Google UI đầy đủ
- **Hiện tại action login vẫn dùng `devSignIn()`**
- Sau login: `pushNamedAndRemoveUntil('/')`

### Register

- Field: name, email, password, confirm, phone?, DOB?, gender?
- Validate:
  - email format
  - password min 6
  - confirm password match
- Gọi `AuthService.registerUser`
- Thành công -> về route root

## 9.2 Welcome flow

2 bước:

1. Chọn mode (travel/explore)
2. Chọn ngôn ngữ

Khi hoàn tất:

- lưu mode + language + first launch
- nếu travel -> sang Tour selection
- nếu explore -> vào Home

## 9.3 Tour Selection

- Hiển thị danh sách tour + tìm kiếm
- Chọn tour và start:
  - lưu `active_tour_id`
  - nếu launch flow -> `HomeScreen`
  - nếu đổi tour từ Home -> pop tour đã chọn

## 9.4 Home

Gồm:

- Bản đồ
- Top bar (search + settings)
- Search suggestion overlay
- Bottom draggable sheet danh sách POI
- Nút đổi tour (travel mode)
- Nút phát nhanh audio trong item list

Travel mode:

- auto move camera theo user
- geofence auto audio

Explore mode:

- không tracking auto
- user tự tương tác map

## 9.5 Settings

- Đổi language (apply tức thời + lưu prefs + cập nhật TTS language)
- Đổi app mode
- Bật/tắt background tracking
- Lưu settings + quay về Home

## 9.6 POI Detail

- Header ảnh + title
- Description + info cards (radius/priority/coordinates)
- Audio controls:
  - play/pause/resume/stop
  - mini-player với seek bar + thời lượng
- Nút direction/share hiện mới placeholder “đang phát triển”

## 9.7 POI List

- Màn hình list đơn giản (ít dùng trong flow chính)

---

## 10) Tiện ích (`core/utils`)

- `DistanceCalculator`: haversine (mét)
- `SmoothPageRoute`: slide + fade transition

---

## 11) Trạng thái thực tế của source mobile (điểm cần lưu ý khi migrate)

1. Dữ liệu backend chưa có, hiện chạy local/hardcoded.
2. Login đang bypass bằng `devSignIn()`.
3. TTS service tồn tại nhưng luồng chính POI playback đang dùng file MP3 (`AudioService`).
4. Google Maps mobile phụ thuộc config key `.env`.
5. Nhiều text đã i18n đầy đủ 6 ngôn ngữ.

---

## 12) Mapping migrate sang React Web (`poi_narration_user`)

## 12.1 Mục tiêu chức năng web cần tương đương

- Auth local (đăng ký + đăng nhập)
- Welcome chọn mode + language
- Tour selection + active tour persistence
- Home map + POI list + search + settings
- Travel mode geolocation + geofence trigger audio
- POI detail + audio player + seek
- i18n 6 ngôn ngữ
- local persistence (mode/language/tour/auth/background)

## 12.2 Mapping kỹ thuật đề xuất (web)

- Router: `react-router-dom`
- Map: `react-leaflet` + OpenStreetMap
- Data fetching/caching (future): `axios`, `@tanstack/react-query`
- Persistence: `localStorage`
- Audio: HTMLAudioElement (hoặc Howler, nhưng HTMLAudio đủ cho scope hiện tại)
- Geolocation: `navigator.geolocation.watchPosition`

## 12.3 Mapping storage key (giữ tương đương mobile)

Nên giữ cùng key để dễ đối chiếu:

- `app_mode`
- `first_launch`
- `background_mode`
- `app_language`
- `active_tour_id`
- `is_logged_in`
- `user_json`
- `user_accounts`

## 12.4 Mapping route/screen web

- `/login`
- `/register`
- `/welcome`
- `/tour-selection`
- `/home`
- `/poi/:id`
- `/settings` (modal/page, tùy UI)

## 12.5 Responsive mobile-first yêu cầu

- Khung app tối đa ~430px centered trên desktop
- Bottom sheet/list cảm giác mobile
- Top bar sticky
- Nút/icon size lớn, touch-friendly

---

## 13) Dữ liệu POI/Tour cần giữ nguyên khi migrate

- Giữ nguyên:
  - `id`
  - `name/description` đa ngôn ngữ
  - `lat/lng`
  - `radius`
  - `priority`
  - `category`
  - `imageUrl`
  - `audio path pattern`
- Giữ 3 tour + mapping `poiIds` như mobile.

---

## 14) Acceptance criteria bản web (đối chiếu mobile)

1. Chạy web và qua được flow login -> welcome -> tour/home.
2. Đổi language cập nhật text runtime.
3. Travel mode:
   - có geolocation watch
   - khi user vào radius POI thì audio POI được phát
   - có cooldown để không trigger liên tục
4. POI detail có điều khiển audio + seek.
5. Build/lint pass.

---

## 15) Kết luận

`poi_narration_mobile` là app offline-first, logic đã tách khá tốt theo service/repository/controller. Khi chuyển sang React web, có thể giữ gần như toàn bộ behavior cốt lõi nếu:

- giữ nguyên domain model + storage schema,
- thay lớp map/location/audio bằng web stack tương đương,
- tổ chức state + routing rõ ràng theo flow hiện tại.

Tài liệu này là nguồn tham chiếu chính để implement bản web trong `poi_narration_user`.
