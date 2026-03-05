# 아기 사주 콘텐츠 제작 계획서

> 이 문서는 아기 사주 콘텐츠를 만들기 위한 전체 TODO 목록입니다.
> 체크박스를 하나씩 완료하면 콘텐츠가 완성됩니다.

---

## Phase 1: 기획 정의

| 항목 | 결정 내용 |
|------|----------|
| 콘텐츠명 | 아기 사주 |
| URL 슬러그 | `/baby-saju` |
| 서비스 타입 키 | `baby_saju` |
| orderId prefix | `baby-saju` |
| 캐릭터 | (미정 - 아래 캐릭터 기획 참고) |
| 챕터 구성 | (미정 - 아래 챕터 기획 참고) |
| 정가 | (미정) |
| 할인가 | (미정) |
| AI 이미지 생성 | (미정) |
| 점수 계산 | (미정) |
| T/F 성격 토글 | N |

### 결정 필요 사항

**캐릭터 후보:**
- 새 캐릭터를 만들지, 기존 캐릭터(까치도령/색동낭자)를 활용할지
- 아기 사주 특성상 따뜻하고 부드러운 톤의 캐릭터가 적합
- 예: "복동이 할머니" (지혜로운 할머니), "꽃분이" (아이를 돌보는 선녀) 등

**입력값 설계 (공통 + 고유):**

공통 (기존과 동일):
- 아기 이름
- 아기 성별
- 아기 생년월일
- 음력/양력
- 태어난 시

고유 (아기 사주 전용):
- [ ] 부모 고민/궁금한 점 (자유 텍스트) - ex: "아이 성격이 궁금해요", "어떤 재능이 있을까요"
- [ ] 태어난 계절/상황 (선택) - ex: 제왕절개/자연분만 등 (선택사항)
- [ ] 형제 순서 (선택) - 첫째/둘째/셋째/외동

**챕터 구성 후보:**

| 장 | 제목 | 내용 |
|----|------|------|
| 1장 | 타고난 기질과 성격 | 일주 기반 아이의 성격, 기질, 특성 |
| 2장 | 숨은 재능과 적성 | 오행/십신 기반 재능 분야 |
| 3장 | 건강 체질과 관리 | 오행 균형에 따른 체질, 약한 부분 |
| 4장 | 교육과 학습 방향 | 어떤 교육 방식이 맞는지, 학습 스타일 |
| 5장 | 또래 관계와 사회성 | 대인관계 성향, 친구 관계 |
| 6장 | 부모와의 궁합 | 부모-자녀 관계 특성, 양육 팁 |
| 7장 | 성장 운세 흐름 | 대운 기반 시기별 주요 변화 |
| 8장 | 이름 한자 풀이 (선택) | 이름과 사주의 조화 |

---

## Phase 2: 에셋 준비

### 필요한 이미지 목록

| 에셋 | 설명 | 경로 | 상태 |
|------|------|------|------|
| [ ] 캐릭터 기본 이미지 | 입력 페이지 대표 | `public/baby-saju/img/intro.png` | 미제작 |
| [ ] 캐릭터 배경 이미지 x10~26장 | ScenePlayer용 | `public/baby-saju/img/{캐릭터}-{N}.jpg` | 미제작 |
| [ ] 상세 페이지 이미지 x2~3장 | detail 상단/중간 | `public/baby-saju/img/detail.jpg` 등 | 미제작 |
| [ ] 홈 카드 배경 | 메인 페이지 카드 | `public/img/baby-saju-card.jpg` | 미제작 |
| [ ] OG 이미지 | SNS 공유 | (외부 URL 또는 `public/og/baby-saju.jpg`) | 미제작 |
| [ ] 인라인 캐릭터 표정 x3~5장 | 결과 마크다운 내 감정 | `public/baby-saju/img/pinch.png` 등 | 미제작 |

---

## Phase 3: 프론트엔드 개발

### 3-1. 입력 페이지 (`app/baby-saju/page.tsx`)

복사 원본: `app/new-year/page.tsx`

**챗봇 대화 스크립트:**
- [ ] step 0: 캐릭터 인사 + "소중한 아이의 사주를 봐드릴게요~"
- [ ] step 1: 아기 이름 입력
- [ ] step 2: 아기 성별 선택 (남아/여아)
- [ ] step 3: 아기 생년월일 입력
- [ ] step 4: 음력/양력 선택
- [ ] step 5: 태어난 시 선택 (시간 모름 포함)
- [ ] step 6: 형제 순서 (첫째/둘째/셋째/외동) - 선택
- [ ] step 7: 부모 고민/궁금한 점 (자유 텍스트)

**기능 구현:**
- [ ] 캐릭터 이미지 변화 (단계별 전환)
- [ ] 이미지 프리로딩 (onMount)
- [ ] 타이핑 효과 콜백
- [ ] 답변 수정 기능 (탭하여 롤백)
- [ ] 스크롤 자동 이동
- [ ] IndexedDB 저장 (`saveBabySajuRecord()`)
- [ ] `computeSaju()` 호출
- [ ] Supabase 레코드 생성 (`createSajuAnalysis()`)
- [ ] 분석 중 로딩 오버레이
- [ ] Mixpanel: `page_view`, `form_submit`
- [ ] `router.push("/baby-saju/detail?id={recordId}")`

### 3-2. 레이아웃 (`app/baby-saju/layout.tsx`)

- [ ] title: "아기 사주 - AI 사주 분석 | 양반가"
- [ ] description: 아기 사주 관련 SEO 설명
- [ ] OG 이미지 메타데이터
- [ ] theme-color 설정

### 3-3. 상세/결제 페이지 (`app/baby-saju/detail/page.tsx`)

복사 원본: `app/new-year/detail/page.tsx`

**사주 정보 표시:**
- [ ] 아기 사주 원국 시각화 (일주, 오행)
- [ ] 일주별 아기 성격 카드 (10개 일간 x 아기 맞춤 내용)
  ```
  甲(갑): "호기심 가득한 탐험가 아이"
  乙(을): "섬세하고 다정한 아이"
  丙(병): "밝고 에너지 넘치는 아이"
  丁(정): "관찰력이 뛰어난 아이"
  戊(무): "듬직하고 안정적인 아이"
  己(기): "꼼꼼하고 배려심 깊은 아이"
  庚(경): "의지가 강한 리더형 아이"
  辛(신): "완벽주의 감각파 아이"
  壬(임): "자유로운 영혼의 창의적 아이"
  癸(계): "직감이 뛰어난 몽상가 아이"
  ```
- [ ] 블러 처리된 미리보기 (결제 유도)

**결제 연동:**
- [ ] TossPayments 위젯
  - `#baby-saju-payment-method`
  - `#baby-saju-agreement`
- [ ] orderId: `baby-saju${orderSuffix}_${Date.now()}`
- [ ] successUrl: `/payment/success?type=baby_saju`
- [ ] failUrl: `/payment/fail?id={id}&type=baby_saju`
- [ ] 쿠폰 시스템 연동
- [ ] 가격/할인율 표시

**무료 쿠폰 플로우:**
- [ ] Supabase 중복 체크 + 레코드 생성
- [ ] 결과 페이지 직접 이동

**데이터 로딩:**
- [ ] IndexedDB 로드
- [ ] Supabase 폴백 로드 (공유 링크)

**트래킹:**
- [ ] Mixpanel: `page_view`, `payment_modal_open`, `payment_modal_close`, `payment_attempt`, `coupon_applied`

### 3-4. 결과 페이지 (`app/baby-saju/result/page.tsx`)

복사 원본: `app/new-year/result/page.tsx`

**ScenePlayer:**
- [ ] `playerConfig` 설정:
  ```
  characterName: "캐릭터명"
  homeRoute: "/baby-saju"
  defaultBgImage: "/baby-saju/img/{캐릭터}-1.jpg"
  ```
- [ ] `buildPartialScenes()` (결제 전 미리보기)
- [ ] `buildFullScenes()` (결제 후 전체 결과)
- [ ] Scene 타입들: `dialogue`, `card`, `waiting`, `action`
- [ ] TOC 라벨 설정

**AI 분석 호출:**
- [ ] FastAPI 직접 호출: `${NEXT_PUBLIC_SAJU_API_URL}/saju_baby/analyze`
- [ ] 응답 IndexedDB 저장
- [ ] 응답 Supabase 저장
- [ ] 재시도 로직 (sessionStorage retry count)
- [ ] `isAnalyzing` 중복 호출 방지

**크로스 브라우저:**
- [ ] IndexedDB 없을 때 Supabase 폴백
- [ ] `seenIntro: true` 설정 (공유 링크)
- [ ] `needsReanalysis` 상태

**기타:**
- [ ] 공유: URL 클립보드 복사 (`/baby-saju/result?id={recordId}`)
- [ ] 이미지 프리로딩 (3개씩 배치)
- [ ] 10초 페이크 로딩
- [ ] 로딩 메시지 로테이션 (아기 사주 맞춤 메시지)
  ```
  "아이의 사주를 꼼꼼히 살펴보고 있어요..."
  "타고난 기질을 분석하고 있어요..."
  "숨은 재능을 찾고 있어요..."
  "성장 운세를 풀어보고 있어요..."
  ```
- [ ] 리뷰/평가 시스템 (action scene)
- [ ] Mixpanel: `page_view`

### 3-5. 결과 설정 (`app/baby-saju/result/config.ts`)

- [ ] `getChapterConfig()` 함수 (챕터 수에 맞게)
- [ ] 각 챕터별:
  - `introText`: 캐릭터 대사
  - `reportText`: 분석 후 코멘트
  - `outroText`: 마무리 대사
  - `bgImage`: 배경 이미지
  - `tocLabel`: 목차 라벨
- [ ] `playerConfig` export

### 3-6. simpleMD 캐릭터 설정

- [ ] `lib/saju-utils.ts`에서 캐릭터 설정:
  ```
  simpleMDBase(src, {
    name: "캐릭터명",
    pinchImg: "/baby-saju/img/pinch.png",
    sokdakImg: "/baby-saju/img/sokdak.png",
    todakImg: "/baby-saju/img/todak.png"
  });
  ```

### 3-7. CSS 파일 (3개)

- [ ] `app/baby-saju/baby-saju.module.css`
- [ ] `app/baby-saju/detail/detail.module.css`
- [ ] `app/baby-saju/result/result.module.css`

---

## Phase 4: 백엔드 개발 (FastAPI)

### 4-1. API 파일 (`fastAPI/saju_baby.py`)

복사 원본: `fastAPI/saju_new_year.py`

- [ ] `APIRouter(prefix="/saju_baby")` 생성
- [ ] 요청 모델:
  ```python
  class SajuBabyAnalysisRequest(BaseModel):
      saju_data: dict
      user_name: str        # 아기 이름
      birth_order: str      # 형제 순서
      parent_concern: str   # 부모 고민
      year: int
  ```
- [ ] `POST /saju_baby/analyze` 엔드포인트

### 4-2. 사주 해석 레퍼런스 (`fastAPI/saju_baby_reference.md`)

> 아기 사주 관점에서 모든 사주 요소를 재해석해야 합니다.

- [ ] **오행(五行)** -- 아이 기질/체질 관점
  - 목(木): 성장, 호기심, 활동성
  - 화(火): 표현력, 사교성, 에너지
  - 토(土): 안정감, 신뢰, 꾸준함
  - 금(金): 결단력, 집중력, 완벽주의
  - 수(水): 지혜, 직관, 창의성

- [ ] **십간(十干)** -- 10개 일간별 아이 성격 상세
  - 甲: 리더형, 독립심 강한 아이 (양육 팁: 자율성 존중)
  - 乙: 협조적, 예술적 감각 (양육 팁: 감성 발달)
  - 丙: 밝고 적극적 (양육 팁: 에너지 발산 기회)
  - 丁: 섬세하고 관찰력 (양육 팁: 정서적 안정)
  - 戊: 듬직하고 포용력 (양육 팁: 일관성 있는 환경)
  - 己: 꼼꼼하고 배려 (양육 팁: 칭찬과 인정)
  - 庚: 강인하고 정의감 (양육 팁: 규칙과 공정함)
  - 辛: 감각적이고 예민 (양육 팁: 미적 환경)
  - 壬: 자유롭고 모험적 (양육 팁: 다양한 경험)
  - 癸: 직감적이고 상상력 (양육 팁: 창의적 놀이)

- [ ] **십신(十神)** -- 아이 발달/관계 관점
  - 비견/겁재: 또래 관계, 경쟁심, 사회성
  - 식신/상관: 표현력, 창의성, 재능 발현
  - 정재/편재: 학습 태도, 성취 방식
  - 정관/편관: 규율 수용, 사회적 적응
  - 정인/편인: 학습 방식, 부모 관계, 지적 호기심

- [ ] **십이운성(十二運星)** -- 성장 단계 관점 해석

- [ ] **합/충/형/파/해** -- 아이 성격의 내적 갈등/조화

- [ ] **신살(神殺)** -- 아이 운명적 특성
  - 천을귀인: 귀인을 잘 만나는 아이
  - 학당귀인: 공부에 재능 있는 아이
  - 도화: 인기 많은 아이
  - 역마: 활동적이고 여행을 좋아하는 아이

- [ ] **대운 해석** -- 성장기 시기별 운세 (10대, 20대, 30대 등)

- [ ] **용신/기신** -- 아이에게 좋은 환경, 피해야 할 환경

### 4-3. 프롬프트 엔지니어링

- [ ] `build_baby_prompt()` 함수 작성
  - 사주 데이터 추출
  - 레퍼런스 인라인 삽입
  - **아기 사주 해석 프레임워크:**
    - 부모에게 말하는 톤 (존댓말, 따뜻하고 희망적)
    - 부정적 내용도 "주의할 점" 으로 긍정 전환
    - 양육 팁/조언 중심
    - 시기별 가이드 (영유아기/학령기/청소년기)
  - 챕터별 출력 형식
  - 캐릭터 말투/톤 설정
  - 글자 수 가이드라인
- [ ] `parse_chapters()` 구현

### 4-4. 추가 기능

- [ ] AI 이미지 생성 여부 결정 (ex: 아이의 미래 모습?)
- [ ] 점수 계산 여부 결정
- [ ] 재시도 로직 (500 에러)

### 4-5. 라우터 등록

- [ ] FastAPI 메인 앱에 `saju_baby` 라우터 등록

---

## Phase 5: 데이터 연동

### 5-1. IndexedDB 모듈 (`lib/db/babySajuDB.ts`)

복사 원본: `lib/db/newYearDB.ts`

- [ ] DB_NAME: `"BabySajuDB"`
- [ ] DB_VERSION: `1`
- [ ] `BabySajuInput` 인터페이스:
  ```typescript
  interface BabySajuInput {
    userName: string;      // 아기 이름
    gender: string;
    date: string;
    calendar: "solar" | "lunar";
    time: string | null;
    birthOrder: string;    // 형제 순서
    parentConcern: string; // 부모 고민
  }
  ```
- [ ] `BabySajuRecord` 타입
- [ ] `saveBabySajuRecord()` -- 저장
- [ ] `getBabySajuRecord()` -- 조회
- [ ] `updateBabySajuRecord()` -- 업데이트
- [ ] `markBabySajuPaid()` -- 결제 완료

### 5-2. 타입 등록 (3곳)

1. [ ] `lib/db/sajuAnalysisDB.ts` -- `SajuServiceType`에 `"baby_saju"` 추가
2. [ ] `lib/db/reviewDB.ts` -- `ServiceType`에 `"baby_saju"` 추가
3. [ ] `lib/mixpanel.ts` -- `ServiceType`에 `"baby_saju"` 추가

### 5-3. Supabase 연동

- [ ] `sajuAnalysisDB.ts`의 `UserInfo`에 아기 사주 전용 필드 추가:
  ```typescript
  // 아기사주 전용 필드
  birthOrder?: string;
  parentConcern?: string;
  ```
- [ ] 이미지 생성 있을 경우 `imageStorage.ts` 확장

### 5-4. 서버 액션 (`app/actions/analyze.ts`)

- [ ] `analyzeBabySaju()` 함수 추가
  ```typescript
  export async function analyzeBabySaju(input: {
    saju_data: SajuData;
    user_name: string;
    birth_order: string;
    parent_concern: string;
    year: number;
  }) { ... }
  ```

### 5-5. 결제 성공 페이지 (`app/payment/success/page.tsx`)

**import 추가:**
- [ ] `import { markBabySajuPaid, getBabySajuRecord } from "@/lib/db/babySajuDB";`

**orderId prefix 매핑 추가 (쿠폰 serviceType):**
- [ ] `orderId?.startsWith("baby-saju") ? "baby_saju"` 케이스 추가 (기존 분기보다 위에!)
  - 주의: "baby-saju"는 "saju"로 시작하므로 기존 `startsWith("saju")` 보다 먼저 체크해야 함

**serviceTypeMap 추가:**
- [ ] `baby_saju: "baby_saju"` 엔트리 추가

**baby_saju 분기 처리:**
- [ ] IndexedDB `markBabySajuPaid()` 호출
- [ ] Supabase upsert (체크 후 update/create)
- [ ] AI 이미지 Storage 업로드 (해당시)
- [ ] UTM/인플루언서 트래킹
- [ ] Mixpanel `payment_success` 이벤트:
  ```
  user_name, gender, birth_date, birth_time, calendar,
  birth_order, parent_concern, day_master, day_master_title
  ```
- [ ] 2초 딜레이 후 `/baby-saju/result?id={id}` 리다이렉트

### 5-6. 결제 실패 페이지 (`app/payment/fail/page.tsx`)

- [ ] `baby_saju` type 처리 확인

---

## Phase 6: 전역 연동

### 6-1. 홈 페이지 카드 (`app/page.tsx`)

- [ ] 아기 사주 서비스 카드 추가
- [ ] 카드 배경 이미지 설정
- [ ] 카드 캐릭터 한자/텍스트 설정
- [ ] `/baby-saju` 링크 연결
- [ ] 카드 위치 결정 (2x2 그리드 → 확장 필요할 수 있음)

### 6-2. 사이트맵 (`app/sitemap.ts`)

- [ ] 추가:
  ```typescript
  { path: "/baby-saju/", priority: 0.9, changeFrequency: "weekly" as const }
  ```

### 6-3. 히스토리 페이지 (`app/history/page.tsx`)

- [ ] `HistoryItem` category 타입에 `"baby_saju"` 추가
- [ ] IndexedDB 열기 추가:
  ```typescript
  const babySajuDB = await openDB("BabySajuDB", 1);
  ```
- [ ] 결제 완료 레코드 수집:
  ```typescript
  babySajuResults.forEach((rec) => {
    if (rec.paid) {
      collectedItems.push({
        id: rec.id,
        category: "baby_saju",
        userName: rec.input?.userName || "아기",
        dayMaster: rec.sajuData?.dayMaster?.char || "?",
        label: `${rec.input?.userName || "아기"}의 아기 사주`,
        sub: rec.input?.date || "",
        ts: rec.paidAt || rec.createdAt || new Date().toISOString(),
        link: `/baby-saju/result?id=${rec.id}`,
      });
    }
  });
  ```
- [ ] 카드 렌더링 로직 (카테고리별 아이콘/색상)

---

## Phase 7: Mixpanel 이벤트 목록

### 입력 페이지
| 이벤트 | 속성 |
|--------|------|
| `page_view` | `service_type: "baby_saju"` |
| `form_submit` | `user_name, gender, birth_date, birth_time, calendar, birth_order, parent_concern, day_master, day_master_title, day_master_element` |

### 상세/결제 페이지
| 이벤트 | 속성 |
|--------|------|
| `page_view` | `id, service_type: "baby_saju"` |
| `payment_modal_open` | `id, price` |
| `payment_modal_close` | `id` |
| `payment_attempt` | `id, price, day_master, is_discount` |
| `coupon_applied` | `coupon_code, discount_type` |

### 결제 성공
| 이벤트 | 속성 |
|--------|------|
| `payment_success` | `order_id, amount, result_id, user_name, gender, birth_date, birth_time, birth_order, parent_concern, day_master, day_master_title, day_master_element` |

### 결과 페이지
| 이벤트 | 속성 |
|--------|------|
| `page_view` | `id, paid, payment_method, payment_price` |

---

## Phase 8: QA 체크리스트

### 입력 플로우
- [ ] 모든 chatStep (0~7) 정상 진행
- [ ] 답변 수정 (탭 롤백) 동작
- [ ] `computeSaju()` 정상 반환
- [ ] IndexedDB 저장 확인
- [ ] Supabase 레코드 생성 확인
- [ ] 분석 중 로딩 오버레이

### 상세/결제 페이지
- [ ] IndexedDB에서 데이터 로드
- [ ] Supabase에서 데이터 로드 (공유 링크)
- [ ] 일주별 아기 성격 카드 10개 정상 표시
- [ ] 블러 미리보기 표시
- [ ] TossPayments 위젯 렌더링
- [ ] 무료 쿠폰 -> 결제 우회 -> 결과 이동
- [ ] 할인 쿠폰 -> 가격 반영
- [ ] 결제 완료 -> `/payment/success` -> 결과 리다이렉트
- [ ] 결제 실패 -> `/payment/fail` 표시

### 결과 페이지
- [ ] FastAPI `/saju_baby/analyze` 호출 성공
- [ ] ScenePlayer 챕터별 표시
- [ ] AI 이미지 표시 (해당시)
- [ ] 재시도 동작
- [ ] 리뷰 작성
- [ ] 공유 기능 (URL 복사)
- [ ] Supabase 결과 저장
- [ ] 크로스 브라우저 공유 링크 -> Supabase 폴백 로드

### 전역
- [ ] Mixpanel 전체 이벤트 (Phase 7)
- [ ] UTM 트래킹
- [ ] 모바일 반응형
- [ ] 인앱 브라우저 대응
- [ ] SEO 메타데이터
- [ ] 사이트맵 엔트리
- [ ] 히스토리 페이지 조회

---

## 파일 생성 체크리스트 (총 12개+)

### 프론트엔드 (8개)
- [ ] `app/baby-saju/page.tsx`
- [ ] `app/baby-saju/baby-saju.module.css`
- [ ] `app/baby-saju/layout.tsx`
- [ ] `app/baby-saju/detail/page.tsx`
- [ ] `app/baby-saju/detail/detail.module.css`
- [ ] `app/baby-saju/result/page.tsx`
- [ ] `app/baby-saju/result/config.ts`
- [ ] `app/baby-saju/result/result.module.css`

### 백엔드 (2개)
- [ ] `fastAPI/saju_baby.py`
- [ ] `fastAPI/saju_baby_reference.md`

### 데이터 (1개)
- [ ] `lib/db/babySajuDB.ts`

### 기존 파일 수정 (6개)
- [ ] `app/page.tsx` -- 홈 카드 추가
- [ ] `app/payment/success/page.tsx` -- baby_saju 분기
- [ ] `app/sitemap.ts` -- 엔트리 추가
- [ ] `app/history/page.tsx` -- IndexedDB 연동
- [ ] `lib/db/sajuAnalysisDB.ts` -- ServiceType 추가
- [ ] `lib/db/reviewDB.ts` -- ServiceType 추가
- [ ] `lib/mixpanel.ts` -- ServiceType 추가
- [ ] `app/actions/analyze.ts` -- 서버 액션 추가
- [ ] FastAPI 메인 앱 -- 라우터 등록

### 이미지 에셋
- [ ] `public/baby-saju/img/` 폴더 전체

---

## 주의사항

### orderId prefix 충돌 방지
`baby-saju`는 기존 `saju-love`의 prefix `saju`로 시작하지 않으므로 안전합니다.
하지만 `payment/success/page.tsx`에서 `orderId?.startsWith()` 순서를 주의:
```
"baby-saju" -> baby_saju  (이것을 먼저 체크)
"saju"      -> saju_love  (이것은 나중에)
```

### 아기 사주 특수 고려사항
- 아기는 아직 어리므로 **부정적 표현 최소화** -- 프롬프트에 반드시 반영
- 부모에게 말하는 톤 (아기에게 말하는 게 아님)
- "주의할 점"은 있되 "나쁘다/안 된다" 표현은 피하기
- 성장 가능성과 잠재력 중심으로 해석
