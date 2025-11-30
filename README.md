# chatbot-jiwon# ALSN 보조금 챗봇 - 설치 가이드

## 📁 파일 구성

```
📦 챗봇 패키지
├── 11-subsidy-chatbot.html      # HTML 구조 (워드프레스 페이지에 붙여넣기)
├── 11-section-subsidy-chatbot.css   # 스타일 (추가 CSS에 붙여넣기)
├── alsn-chatbot.js              # 프론트엔드 스크립트
└── alsn-chatbot-ajax.php        # 백엔드 API 처리 (⚠️ 비공개 유지)
```

---

## 🔒 보안 설정 (가장 중요!)

### 1단계: API 키 설정 (wp-config.php)

`wp-config.php` 파일에 다음 코드를 추가하세요:

```php
// 보조금24 API 키 (절대 공개 금지!)
define('ALSN_SUBSIDY_API_KEY', '여기에_실제_API_키_입력');

// 개발 모드 (프로덕션에서는 반드시 false)
define('ALSN_DEV_MODE', false);
```

### 2단계: .gitignore 설정

API 키가 유출되지 않도록 `.gitignore`에 추가:

```
wp-config.php
alsn-chatbot-ajax.php
```

### 3단계: PHP 파일 보호

`alsn-chatbot-ajax.php`는 **절대로**:
- ❌ GitHub/GitLab에 업로드 금지
- ❌ 공개 저장소에 커밋 금지
- ❌ 클라이언트에게 소스코드 공유 금지

---

## 📥 설치 방법

### 방법 1: 테마에 직접 추가

1. **PHP 파일**
   - `alsn-chatbot-ajax.php` → `wp-content/themes/your-theme/` 폴더에 업로드
   - `functions.php` 맨 아래에 추가:
   ```php
   require_once get_template_directory() . '/alsn-chatbot-ajax.php';
   ```

2. **CSS 파일**
   - `11-section-subsidy-chatbot.css` → `wp-content/themes/your-theme/assets/css/` 폴더에 업로드
   - 또는 **외모 > 커스터마이즈 > 추가 CSS**에 전체 내용 붙여넣기

3. **JS 파일**
   - `alsn-chatbot.js` → `wp-content/themes/your-theme/assets/js/` 폴더에 업로드

4. **HTML 파일**
   - `11-subsidy-chatbot.html` → `wp-content/themes/your-theme/template-parts/` 폴더에 업로드

### 방법 2: 숏코드 사용

설치 완료 후 페이지에서 숏코드 사용:

```
[alsn_chatbot]
```

### 방법 3: 직접 HTML 삽입

워드프레스 페이지 편집기에서:
1. HTML 블록 추가
2. `11-subsidy-chatbot.html` 내용 붙여넣기

---

## ⚙️ 파일 경로 설정

`alsn-chatbot-ajax.php`에서 파일 경로 확인:

```php
// CSS 경로 (테마 구조에 맞게 수정)
get_template_directory_uri() . '/assets/css/11-section-subsidy-chatbot.css'

// JS 경로 (테마 구조에 맞게 수정)
get_template_directory_uri() . '/assets/js/alsn-chatbot.js'

// HTML 경로 (테마 구조에 맞게 수정)
get_template_directory() . '/template-parts/11-subsidy-chatbot.html'
```

---

## 🧪 테스트 방법

1. **개발 모드 활성화** (테스트 시에만)
   ```php
   define('ALSN_DEV_MODE', true);
   ```
   → 더미 데이터로 UI 테스트 가능

2. **브라우저 개발자 도구**
   - Network 탭에서 AJAX 요청 확인
   - Console에서 에러 확인

3. **관리자 페이지**
   - 설정 > 보조금 챗봇에서 상태 확인

---

## 🛡️ 보안 체크리스트

프로덕션 배포 전 확인:

- [ ] API 키가 wp-config.php에 상수로 정의됨
- [ ] ALSN_DEV_MODE가 false로 설정됨
- [ ] PHP 파일이 공개 저장소에 없음
- [ ] .gitignore에 민감한 파일 포함됨
- [ ] wp-config.php가 버전 관리에서 제외됨

---

## 📞 문의

문제 발생 시 다음 정보와 함께 문의:
1. 에러 메시지 스크린샷
2. 브라우저 Console 로그
3. PHP 에러 로그 (민감 정보 제거 후)

---

## 📝 변경 이력

- v1.0.0 (2024-XX-XX): 최초 배포
  - 개인/소상공인/법인 3가지 유형 지원
  - 보조금24 API 연동
  - 모바일 최적화 UI
