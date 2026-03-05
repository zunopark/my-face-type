# 양반가 콘텐츠 제작 가이드

> 새로운 사주/운세 콘텐츠를 만들 때 참고하는 마스터 문서입니다.
> 아이디어만 있으면 이 가이드를 따라 TODO를 체크하면서 완성할 수 있습니다.

---

## 전체 구조 요약

모든 콘텐츠는 동일한 **4단계 퍼널**을 따릅니다:

```
홈 카드 → 입력 페이지(챗봇) → 상세/결제 페이지 → 결과 페이지(ScenePlayer)
```

```
app/{type}/
├── page.tsx                    # 챗봇 입력 페이지
├── {type}.module.css           # 입력 페이지 스타일
├── layout.tsx                  # SEO 메타데이터
├── detail/
│   ├── page.tsx                # 상세/결제 페이지
│   └── detail.module.css       # 상세 페이지 스타일
└── result/
    ├── page.tsx                # 결과 페이지 (ScenePlayer)
    ├── config.ts               # 챕터별 설정 (배경, 인트로/아웃트로)
    └── result.module.css       # 결과 페이지 스타일

fastAPI/saju_{type}.py          # AI 분석 백엔드
fastAPI/saju_{type}_reference.md # 사주 해석 레퍼런스
lib/db/{type}DB.ts              # IndexedDB 모듈
```

---

## 기존 콘텐츠 레퍼런스

| 항목 | 신년사주 (`/new-year`) | 연애사주 (`/saju-love`) |
|------|----------------------|------------------------|
| 캐릭터 | 까치도령 (명랑한 학자) | 색동낭자 (다정한 상담사) |
| 챕터 수 | 11장 | 6장 |
| 고유 입력 | 직업상태, 연애상태, 소원 | 연애상태, 고민사항 |
| 가격 | 49,800 -> 26,900원 | 44,800 -> 23,900원 |
| AI 이미지 | 없음 | 있음 (이상형 + 피해야할 상대) |
| 점수 계산 | 있음 (종합점수) | 없음 |
| T/F 성격 토글 | 있음 | 없음 |
| 캐릭터 이미지 수 | ~10장 | ~26장 |
| FastAPI | `saju_new_year.py` | `saju_love.py` |
| 레퍼런스 | `saju_new_year_reference.md` (~1,900줄) | `saju_romance_reference.md` (~1,000줄) |
| orderId prefix | `new-year` | `saju-love` |

---

## Phase 1: 기획 (아이디어 정의)

새 콘텐츠를 시작하기 전에 아래 표를 채워주세요:

| 항목 | 결정할 내용 | 작성란 |
|------|-----------|--------|
| 콘텐츠명 | 한글 이름 (ex: 취업운세) | |
| URL 슬러그 | 라우트 경로 (ex: `/job-fortune`) | |
| 서비스 타입 키 | DB/결제/분석 구분용 (ex: `job_fortune`) | |
| orderId prefix | 결제 주문번호 접두어 (ex: `job-fortune`) | |
| 캐릭터 이름 | 이름 + 성격 설정 | |
| 캐릭터 말투/톤 | 프롬프트에 쓸 말투 스타일 | |
| 챕터 구성 | 결과에 들어갈 장 수와 제목 목록 | |
| 공통 입력 | 이름, 성별, 생년월일, 음양력, 태어난 시 (고정) | |
| 고유 입력 | 콘텐츠별 추가 질문들 | |
| 정가 | 원래 가격 | |
| 할인가 | 실 결제 가격 | |
| 할인 쿠폰가 | discountPrice (선택, ex: 9,900원) | |
| AI 이미지 생성 | 결과에 이미지 포함 여부 (Y/N) | |
| 점수 계산 | 운세 점수 포함 여부 (Y/N) | |
| T/F 성격 토글 | detail 페이지에 T/F 토글 (Y/N) | |

---

## Phase 2: 에셋 준비 (디자인/이미지)

| 에셋 | 설명 | 경로 | 수량 |
|------|------|------|------|
| 캐릭터 기본 이미지 | 입력 페이지 대표 이미지 | `public/{type}/img/intro.png` | 1장 |
| 캐릭터 배경 이미지 | 결과 ScenePlayer용 장면 배경 | `public/{type}/img/{캐릭터}-{N}.jpg` | 10~26장 |
| 상세 페이지 이미지 | detail 페이지 상단/중간 일러스트 | `public/{type}/img/detail.jpg` 등 | 2~3장 |
| 홈 카드 배경 | 메인 페이지 서비스 카드 배경 | `public/img/{type}-card.jpg` | 1장 |
| OG 이미지 | SNS 공유 미리보기 | 외부 URL 또는 `public/og/` | 1장 |
| 인라인 캐릭터 표정 | 결과 마크다운 내 감정 표현 이미지 | `public/{type}/img/pinch.png` 등 | 0~5장 |

### 이미지 제작 팁
- 캐릭터 배경 이미지는 ScenePlayer에서 전환되며 보여지므로, 다양한 포즈/표정이 필요
- 인라인 캐릭터 표정은 AI 분석 결과 텍스트 사이에 삽입됨 (찡긋, 속닥속닥, 토닥토닥 등)
- 홈 카드 배경은 `app/page.tsx`의 카드 컴포넌트에서 사용

---

## Phase 3: 프론트엔드 개발

### 3-1. 입력 페이지 (`app/{type}/page.tsx`)

기존 파일 복사 원본: `app/saju-love/page.tsx` 또는 `app/new-year/page.tsx`

- [ ] 캐릭터 인사말/대화 스크립트 작성 (chatStep별)
- [ ] 공통 입력 유지: 이름, 성별, 생년월일, 음/양력, 태어난 시
- [ ] 고유 입력 질문 추가 (Phase 1에서 정의한 것)
- [ ] 캐릭터 이미지 변화 설정 (단계별 이미지 전환)
- [ ] 이미지 프리로딩 설정 (onMount시 캐릭터 이미지 배치 프리로드)
- [ ] 타이핑 효과 (`typeNangjaMessage`) 콜백 설정
- [ ] 답변 수정 기능 (`handleEditAnswer` - 탭하여 이전 스텝으로 롤백)
- [ ] 스크롤 자동 이동 로직
- [ ] IndexedDB 저장 함수 연결 (`save{Type}Record()`)
- [ ] `computeSaju()` 서버 액션 호출
- [ ] Supabase 레코드 생성 (`createSajuAnalysis()` - 결정 필요: 입력시 vs detail에서)
- [ ] 분석 중 로딩 오버레이 (스피너 + 회전 메시지)
- [ ] Mixpanel 이벤트: `page_view`, `form_submit`
- [ ] detail 페이지로 네비게이션 (`/{type}/detail?id={recordId}`)

### 3-2. 레이아웃 (`app/{type}/layout.tsx`)

- [ ] 페이지 title, description 설정
- [ ] OG 이미지 메타데이터
- [ ] 캐릭터별 viewport 색상 (theme-color)

### 3-3. 상세/결제 페이지 (`app/{type}/detail/page.tsx`)

기존 파일 복사 원본: `app/saju-love/detail/page.tsx` 또는 `app/new-year/detail/page.tsx`

**사주 정보 표시:**
- [ ] 사주 정보 시각화 (일주, 오행, 십이운성 카드 등)
- [ ] 일주별 성격 데이터 작성 (10개 일간 x 커스텀 카드 내용)
  - 甲(갑), 乙(을), 丙(병), 丁(정), 戊(무), 己(기), 庚(경), 辛(신), 壬(임), 癸(계)
- [ ] T/F 성격 토글 (선택 - `personalityType` state)
- [ ] 블러 처리된 미리보기 섹션 (결제 유도)

**결제 연동:**
- [ ] TossPayments 결제 위젯 연동
  - payment method selector: `#{type}-payment-method`
  - agreement selector: `#{type}-agreement`
- [ ] orderId 형식: `{type}${orderSuffix}_${Date.now()}`
  - 중요: orderId prefix가 `payment/success` 페이지의 라우팅을 결정함
- [ ] successUrl: `/payment/success?type={service_type}`
- [ ] failUrl: `/payment/fail?id={id}&type={service_type}`
- [ ] 쿠폰 시스템 연동 (`/api/coupon/validate`, `/api/coupon/use`)
- [ ] 가격/할인율 표시

**무료 쿠폰 플로우:**
- [ ] 무료 쿠폰 적용시 결제 우회 → 직접 결과 페이지로 이동
- [ ] Supabase 중복 체크 후 레코드 생성 (`getSajuAnalysisByShareId` → `createSajuAnalysis`)

**데이터 로딩:**
- [ ] IndexedDB에서 데이터 로드
- [ ] Supabase에서 데이터 로드 (공유 링크로 다른 브라우저에서 접근시)

**트래킹:**
- [ ] Mixpanel: `page_view`, `payment_modal_open`, `payment_modal_close`, `payment_attempt`, `coupon_applied`

### 3-4. 결과 페이지 (`app/{type}/result/page.tsx`)

기존 파일 복사 원본: `app/saju-love/result/page.tsx` 또는 `app/new-year/result/page.tsx`

**ScenePlayer 연결:**
- [ ] ScenePlayer 컴포넌트 연결
- [ ] `playerConfig` 객체 설정:
  ```
  characterName: "캐릭터명"
  homeRoute: "/{type}"
  defaultBgImage: "/{type}/img/{캐릭터}-1.jpg"
  ```
- [ ] `buildPartialScenes()` 함수 (결제 전 미리보기: 인트로 + 사주 카드 + waiting)
- [ ] `buildFullScenes()` 함수 (결제 후 전체: 모든 챕터 + 리뷰)
- [ ] Scene 타입들: `dialogue`, `card`, `waiting`, `action`
- [ ] TOC 라벨 설정 (`tocLabel` 속성)

**AI 분석 호출:**
- [ ] FastAPI 직접 호출 (`NEXT_PUBLIC_SAJU_API_URL` + `/saju_{type}/analyze`)
  - Netlify 함수 타임아웃 우회를 위해 클라이언트에서 직접 호출
- [ ] 응답을 IndexedDB에 저장
- [ ] 응답을 Supabase에 저장 (업데이트)
- [ ] 재시도 로직 (`sessionStorage`로 retry count 관리)
- [ ] `isAnalyzing` 플래그로 중복 호출 방지

**크로스 브라우저 데이터 복구:**
- [ ] IndexedDB에 데이터 없을 때 Supabase에서 로드 (공유 링크 시나리오)
- [ ] Supabase에서 로드시 `seenIntro: true` 설정 (인트로 애니메이션 스킵)
- [ ] AI 이미지가 있는 경우 Storage URL에서 base64 복원
- [ ] `needsReanalysis` 상태 처리 (결제됐지만 분석 결과 없는 경우)

**기타:**
- [ ] 공유 기능: URL 클립보드 복사 (`/{type}/result?id={recordId}`)
- [ ] 이미지 프리로딩 (캐릭터 배경 이미지 배치 프리로드, 3개씩)
- [ ] 10초 페이크 로딩 (첫 방문시, partial scenes 전)
- [ ] 로딩 메시지 로테이션 (분석 중 표시되는 콘텐츠 맞춤 메시지들)
- [ ] 리뷰/평가 시스템 (action scene으로 삽입)
  - `getReviewByRecordId()` 기존 리뷰 체크
  - 별점 + 텍스트 리뷰 모달
- [ ] Mixpanel: `page_view` (id, paid, payment_method, payment_price)

### 3-5. 결과 설정 (`app/{type}/result/config.ts`)

- [ ] `getChapterConfig()` 함수 작성
- [ ] 각 챕터별 설정:
  - `introText`: 챕터 시작 전 캐릭터 대사
  - `reportText`: 분석 결과 후 캐릭터 코멘트
  - `outroText`: 챕터 마무리 대사
  - `bgImage`: 해당 장면의 캐릭터 배경 이미지
  - `tocLabel`: 목차 라벨
- [ ] `playerConfig` 객체 export

### 3-6. simpleMD 캐릭터 설정

`lib/saju-utils.ts`의 `simpleMD` 함수에 캐릭터 설정 전달:

```typescript
simpleMDBase(src, {
  name: "캐릭터명",
  pinchImg: "/{type}/img/pinch.png",
  sokdakImg: "/{type}/img/sokdak.png",
  todakImg: "/{type}/img/todak.png"
});
```

### 3-7. 콘텐츠별 템플릿 파서 (선택)

신년사주처럼 템플릿 기반 응답 포맷이 있는 경우:
- [ ] `lib/parse{Type}Template.ts` 생성 (참고: `lib/parseNewYearTemplate.ts`)

### 3-8. CSS 파일 (3개)

- [ ] `{type}.module.css` -- 입력 페이지 스타일
- [ ] `detail/detail.module.css` -- 상세 페이지 스타일
- [ ] `result/result.module.css` -- 결과 페이지 스타일

---

## Phase 4: 백엔드 개발 (FastAPI)

### 4-1. API 파일 생성 (`fastAPI/saju_{type}.py`)

기존 파일 참고: `fastAPI/saju_love.py` 또는 `fastAPI/saju_new_year.py`

- [ ] `APIRouter(prefix="/saju_{type}")` 생성
- [ ] Pydantic 요청 모델 정의 (`Saju{Type}AnalysisRequest`)
  - 공통: `saju_data`, `user_name`, `year`
  - 고유: Phase 1에서 정의한 추가 필드
- [ ] `POST /saju_{type}/analyze` 엔드포인트 구현

### 4-2. 사주 해석 레퍼런스 파일 작성 (핵심!)

> AI가 정밀한 사주 풀이를 하려면 반드시 고품질 레퍼런스가 필요합니다.
> 이 파일이 분석 품질의 80%를 결정합니다.

기존 레퍼런스 참고:
- `fastAPI/saju_romance_reference.md` (~1,000줄) -- 연애사주용
- `fastAPI/saju_new_year_reference.md` (~1,900줄) -- 신년사주용

**레퍼런스 파일 작성 TODO (`fastAPI/saju_{type}_reference.md`):**

- [ ] **오행(五行) 해석 기준** -- 목/화/토/금/수 각각이 콘텐츠 주제에서 의미하는 바
- [ ] **십간(十干) 해석** -- 甲~癸 10개 일간별 콘텐츠 주제 관련 성향/특성
- [ ] **십이지(十二支) 해석** -- 자~해 12지지별 특성
- [ ] **십신(十神) 해석** -- 비견/겁재/식신/상관/정재/편재/정관/편관/정인/편인이 콘텐츠 주제에서 의미하는 바
- [ ] **십이운성(十二運星) 해석** -- 장생~태 12단계별 콘텐츠 관점 해석
- [ ] **합/충/형/파/해 관계** -- 지지 관계가 콘텐츠 주제에 미치는 영향
- [ ] **신살(神殺) 해석** -- 주요 신살들의 콘텐츠 주제 관련 의미
- [ ] **대운/세운 해석 기준** -- 현재 운의 흐름이 콘텐츠 주제에 미치는 영향
- [ ] **용신/기신 활용법** -- 콘텐츠 주제에서의 조언/방향 제시 기준

### 4-3. 프롬프트 엔지니어링

> 레퍼런스를 기반으로 AI에게 지시하는 프롬프트를 작성합니다.

- [ ] `build_{type}_prompt()` 함수 작성
  - 사주 데이터 추출 (일주, 사주 원국, 십신, 십이운성, 대운, 세운 등)
  - 위 레퍼런스 파일 내용 프롬프트에 인라인 삽입
  - 콘텐츠 주제에 맞는 해석 프레임워크
  - 챕터별 출력 형식 지정 (`[1장]`, `[2장]`, ...)
  - 캐릭터 말투/톤 설정
  - 글자 수 가이드라인
- [ ] `parse_chapters()` 구현 (챕터 수에 맞게 파싱)

### 4-4. 추가 기능 (선택)

- [ ] AI 이미지 생성 (Gemini 2.5 Flash Image API 호출)
- [ ] 점수 계산 로직 (`calculate_{type}_score()`)
- [ ] 재시도 로직 (500 에러 시)

### 4-5. 라우터 등록

- [ ] FastAPI 메인 앱에 새 라우터 등록 (`app.include_router(...)`)

---

## Phase 5: 데이터 연동

### 5-1. IndexedDB 모듈 (`lib/db/{type}DB.ts`)

기존 파일 참고: `lib/db/sajuLoveDB.ts` 또는 `lib/db/newYearDB.ts`

- [ ] 레코드 타입 정의 (`{Type}Record`)
- [ ] DB 이름 정의 (ex: `"JobFortuneDB"`)
- [ ] `save{Type}Record()` -- 저장
- [ ] `get{Type}Record()` -- 조회
- [ ] `update{Type}Record()` -- 업데이트
- [ ] `mark{Type}Paid()` -- 결제 완료 처리

### 5-2. 타입 등록 (3곳!)

새 `service_type`을 **3개 파일**에 등록해야 합니다:

1. [ ] `lib/db/sajuAnalysisDB.ts` -- `SajuServiceType` union에 추가
2. [ ] `lib/db/reviewDB.ts` -- `ServiceType` union에 추가
3. [ ] `lib/mixpanel.ts` -- `ServiceType` union에 추가

### 5-3. Supabase 연동

- [ ] `saju_analyses` 테이블 사용 (새 테이블 불필요 - 모든 콘텐츠 공유)
  - `service_type` 필드로 구분
  - `user_info` JSONB에 콘텐츠별 고유 입력값 저장
- [ ] 이미지 저장 필요시 `lib/storage/imageStorage.ts` 확장

### 5-4. 서버 액션 (`app/actions/analyze.ts`)

- [ ] 새 콘텐츠용 분석 함수 추가 (ex: `analyzeJobFortune()`)
  - 콘텐츠별 Pydantic 모델에 맞는 요청 인터페이스 정의
  - FastAPI 엔드포인트 URL 설정

### 5-5. 결제 성공 페이지 (`app/payment/success/page.tsx`)

새 콘텐츠 type 분기를 추가해야 합니다. 처리 순서:

1. [ ] `reportType` 분기 추가 (`searchParams.get("type")` 케이스)
2. [ ] `confirmPayment()` 서버 액션 호출 (TossPayments 검증)
3. [ ] 할인 쿠폰시 `/api/coupon/use` 호출
4. [ ] IndexedDB `mark{Type}Paid()` + 결제 정보 저장
5. [ ] Supabase upsert (존재 체크 후 update 또는 create)
6. [ ] AI 이미지가 있는 경우 Supabase Storage 업로드
7. [ ] UTM/인플루언서 트래킹 (`getStoredUtmParams()` → `/api/admin/influencers` 조회)
8. [ ] `serviceTypeMap`에 새 서비스 타입 추가
9. [ ] Mixpanel: `payment_success` 이벤트 (모든 user info 포함)
10. [ ] 2초 딜레이 후 `/{type}/result?id={id}` 리다이렉트

### 5-6. 결제 실패 페이지 (`app/payment/fail/page.tsx`)

- [ ] 새 콘텐츠 type 처리 확인 (failUrl에서 `type={service_type}` 전달됨)

---

## Phase 6: 홈 화면 & 전역 연동

### 6-1. 홈 페이지 카드 (`app/page.tsx`)

- [ ] 새 서비스 카드 컴포넌트 추가
- [ ] 카드 배경 이미지 설정 (`.cardBg` 스타일)
- [ ] 카드 캐릭터 한자/텍스트 설정
- [ ] 링크 경로 연결 (`/{type}`)
- [ ] 카드 순서/위치 결정 (2x2 그리드)

### 6-2. 사이트맵 (`app/sitemap.ts`)

- [ ] 새 콘텐츠 URL 엔트리 추가 (priority 설정)

### 6-3. 히스토리 페이지 (`app/history/page.tsx`)

- [ ] 새 IndexedDB 열기 (`openDB("{Type}DB", 1)`)
- [ ] 결제 완료 레코드 수집 로직 추가
- [ ] 카드 렌더링 (카테고리명, 결과 페이지 링크)

---

## Phase 7: Mixpanel 이벤트 전체 목록

각 페이지에서 발생시켜야 하는 이벤트:

### 입력 페이지
| 이벤트 | 주요 속성 |
|--------|----------|
| `page_view` | service_type |
| `form_submit` | day_master, day_master_title, day_master_element, gender, birth_date, birth_time, user_name, 고유입력값들 |

### 상세/결제 페이지
| 이벤트 | 주요 속성 |
|--------|----------|
| `page_view` | id, service_type |
| `payment_modal_open` | id, price |
| `payment_modal_close` | id |
| `payment_attempt` | id, price, day_master, is_discount |
| `coupon_applied` | coupon_code, discount_type |

### 결제 성공
| 이벤트 | 주요 속성 |
|--------|----------|
| `payment_success` | order_id, amount, result_id, 모든 user info |

### 결과 페이지
| 이벤트 | 주요 속성 |
|--------|----------|
| `page_view` | id, paid, payment_method, payment_price |

---

## Phase 8: QA 체크리스트

### 입력 플로우
- [ ] 모든 chatStep 정상 진행
- [ ] 답변 수정 (탭하여 뒤로가기) 동작
- [ ] 사주 계산(`computeSaju()`) 정상 반환
- [ ] IndexedDB에 레코드 저장 확인
- [ ] 분석 중 로딩 오버레이 표시

### 상세/결제 페이지
- [ ] IndexedDB에서 데이터 로드
- [ ] Supabase에서 데이터 로드 (공유 링크 케이스)
- [ ] 일주별 성격 카드 정상 표시
- [ ] 블러 미리보기 표시
- [ ] TossPayments 위젯 렌더링
- [ ] 무료 쿠폰 -> 결제 우회 후 결과 페이지 이동
- [ ] 할인 쿠폰 -> 가격 정상 반영
- [ ] 결제 완료 -> `/payment/success` -> 결과 페이지 리다이렉트
- [ ] 결제 실패 -> `/payment/fail` 페이지 정상 표시

### 결과 페이지
- [ ] FastAPI 호출 성공
- [ ] ScenePlayer 챕터별 결과 표시
- [ ] AI 생성 이미지 표시 (해당시)
- [ ] AI 실패시 재시도 동작
- [ ] 리뷰 작성 기능
- [ ] 공유 기능 (URL 클립보드 복사)
- [ ] Supabase에 결과 저장
- [ ] 크로스 브라우저: 다른 기기에서 공유 링크로 접근시 Supabase에서 로드

### 전역
- [ ] Mixpanel 이벤트 트래킹 (Phase 7 전체 목록)
- [ ] UTM 파라미터 트래킹
- [ ] 모바일 반응형 확인
- [ ] 인앱 브라우저 대응 (카카오톡, 인스타 등)
- [ ] SEO 메타데이터 확인
- [ ] 사이트맵 엔트리 확인
- [ ] 히스토리 페이지에서 결과 조회 가능

---

## 공통 코드 (이미 존재 - 건드릴 필요 없음)

| 모듈 | 위치 | 용도 |
|------|------|------|
| `computeSaju()` | `app/actions/analyze.ts` | 사주 계산 |
| `confirmPayment()` | `app/actions/analyze.ts` | TossPayments 결제 확인 |
| ScenePlayer | `components/scene-player/` | 결과 애니메이션 플레이어 |
| TossPayments Script | `app/layout.tsx` (전역 로드) | 결제 위젯 SDK |
| 쿠폰 API | `/api/coupon/validate`, `/api/coupon/use` | 쿠폰 검증/사용 |
| Mixpanel | `lib/mixpanel.ts` | 이벤트 트래킹 |
| Supabase DB | `lib/db/sajuAnalysisDB.ts` | 서버측 데이터 저장 |
| Image Storage | `lib/storage/imageStorage.ts` | 이미지 업로드 |
| simpleMD | `lib/saju-utils.ts` | 마크다운 -> HTML (캐릭터 표정 삽입) |
| InAppBrowserBanner | `app/layout.tsx` (전역) | 인앱 브라우저 감지/안내 |
| Google Analytics | `app/layout.tsx` (전역) | 트래픽 분석 |
| Google Ads | `app/layout.tsx` (전역) | 광고 전환 추적 |

---

## 환경 변수

새 콘텐츠 추가시 새로운 환경 변수는 불필요합니다. 기존 변수들을 사용:

| 변수 | 용도 | 사용 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SAJU_API_URL` | FastAPI 클라이언트 직접 호출 | result 페이지 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | TossPayments 위젯 | detail 페이지 |
| `API_URL` | FastAPI 서버 액션 호출 | `app/actions/analyze.ts` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | `app/layout.tsx` (전역) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | DB 모듈들 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | DB 모듈들 |

---

## 작업 흐름 예시

```
1. "취업운세 만들자!" -> Phase 1 표 채우기

2. Phase 1 완성 -> Phase 2 이미지 목록 정리 -> 디자인 제작

3. 이미지 준비 완료 -> Phase 3~6 개발 시작
   (기존 saju-love 또는 new-year 코드를 복사하여 커스텀)

4. 개발 완료 -> Phase 7 Mixpanel 이벤트 확인

5. Phase 8 QA 체크리스트 전체 통과

6. 배포!
```

---

## AI 모델 정보

| 용도 | 모델 | 비고 |
|------|------|------|
| 텍스트 분석 | Gemini 2.5 Flash | temperature 0.7, max 48,000 tokens |
| 이미지 생성 | Gemini 2.5 Flash Image | 120s timeout |
| 사주 계산 | 자체 로직 | `computeSaju()` 서버 액션 |
