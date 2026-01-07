from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from google import genai
from google.genai import types
import base64
import os

router = APIRouter(prefix="/saju_love", tags=["saju_love"])

# Gemini API 클라이언트 설정
# API 키는 환경 변수 GEMINI_API_KEY에서 자동으로 가져옵니다
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class SajuLoveAnalysisRequest(BaseModel):
    saju_data: Dict[str, Any]  # compute_saju 결과 전체
    user_name: str = None
    user_concern: str = None  # 고객의 연애 고민 (4장에 사용)
    year: int = 2026  # 분석할 연도

def parse_chapters(text: str) -> list:
    """
    AI 응답을 챕터별로 분리
    """
    chapters = []

    # 챕터 구분자로 분리
    chapter_markers = [
        "[1장]",
        "[2장]",
        "[3장]",
        "[4장]"
    ]

    current_chapter = {"number": 0, "title": "전체", "content": ""}

    lines = text.split('\n')
    for line in lines:
        # 챕터 시작 감지
        for i, marker in enumerate(chapter_markers, 1):
            if marker in line or f"{i}장" in line:
                if current_chapter["content"].strip():
                    chapters.append(current_chapter)
                current_chapter = {
                    "number": i,
                    "title": line.replace(marker, "").strip(),
                    "content": ""
                }
                break
        else:
            current_chapter["content"] += line + "\n"

    # 마지막 챕터 추가
    if current_chapter["content"].strip():
        chapters.append(current_chapter)

    # 챕터가 없으면 전체를 하나로
    if not chapters:
        chapters = [{
            "number": 1,
            "title": "연애운 분석",
            "content": text
        }]

    return chapters

def build_love_prompt(saju_data: Dict[str, Any], user_name: str = None, user_concern: str = None, year: int = 2026) -> str:
    """
    사주 데이터를 기반으로 연애 분석 프롬프트 생성
    """

    # 사주 데이터 추출
    day_master = saju_data.get("dayMaster", {})
    pillars = saju_data.get("pillars", {})
    five_elements = saju_data.get("fiveElements", {})
    love_facts = saju_data.get("loveFacts", {})
    input_info = saju_data.get("input", {})

    # 사용자 이름
    name = user_name or input_info.get("name") or "고객"
    gender = "남성" if input_info.get("gender") == "male" else "여성"

    # 일간 정보
    dm_char = day_master.get("char", "")
    dm_title = day_master.get("title", "")
    dm_element = day_master.get("element", "")
    dm_yinyang = day_master.get("yinYang", "")

    # 오행 분포
    five_percent = love_facts.get("fiveElementsHanjaPercent", {})
    strength = love_facts.get("dayMasterStrength", "")

    # 도화살
    peach = love_facts.get("peachBlossom", {})
    has_peach = peach.get("hasPeach", False)
    peach_branch = peach.get("targetBranch", "")

    # 배우자 별
    spouse = love_facts.get("spouseStars", {})
    spouse_type = love_facts.get("spouseTargetType", "")
    spouse_count = spouse.get("hitCount", 0)
    spouse_positions = spouse.get("positions", [])

    # 사주 팔자 문자열
    def pillar_str(p):
        if not p or not p.get("stem") or not p.get("branch"):
            return "—"
        return f"{p['stem']['char']}{p['branch']['char']}({p['stem']['korean']}{p['branch']['korean']})"

    year_pillar = pillar_str(pillars.get("year"))
    month_pillar = pillar_str(pillars.get("month"))
    day_pillar = pillar_str(pillars.get("day"))
    hour_pillar = pillar_str(pillars.get("hour"))

    # 십성 정보
    def tengod_str(p):
        if not p:
            return "—"
        stem_tg = p.get("tenGodStem", "—")
        branch_tg = p.get("tenGodBranchMain", "—")
        return f"천간:{stem_tg}, 지지:{branch_tg}"

    year_tengod = tengod_str(pillars.get("year"))
    month_tengod = tengod_str(pillars.get("month"))
    day_tengod = tengod_str(pillars.get("day"))
    hour_tengod = tengod_str(pillars.get("hour"))

    # 고민 내용 처리
    concern_text = ""
    if user_concern:
        concern_text = f"""

### {name}님의 고민
"{user_concern}"

→ 이 고민은 4장에서 사주/관상학적 근거를 들어 심리상담 차원에서 답변해 주세요.
"""

    prompt = f"""
### 1. 페르소나 설정
당신은 고객의 연애 심리와 관계 역학을 사주적/관상학적 관점에서 깊이 있게 통찰하고, 이를 매력적이고 서술적인 언어로 풀어내는 전문 연애 여성 사주가 '홍련' 입니다.

### 2. 분석의 대상과 정보 제공
[분석 대상] {name}님({gender})의 사주적, 관상학적 성향 및 연애운을 종합적으로 분석해 주세요.

[{name}님의 핵심 특징]
- **일간**: {dm_char} ({dm_title}) - {dm_element} 기운, {dm_yinyang}
- **신강/신약**: {strength}
- **사주 팔자**:
  - 년주: {year_pillar} ({year_tengod})
  - 월주: {month_pillar} ({month_tengod})
  - 일주: {day_pillar} ({day_tengod})
  - 시주: {hour_pillar} ({hour_tengod})
- **오행 분포**: {', '.join([f'{k} {v}%' for k, v in five_percent.items()])}
- **도화살**: {'있음 ({})'.format(peach_branch) if has_peach else '없음'}
- **배우자 별({spouse_type})**: {spouse_count}개 ({', '.join(spouse_positions) if spouse_positions else '없음'})
{concern_text}

### 3. 문체 및 어조 지정
[요구 문체]
1. **{name}님**과 같이 개인을 지칭하는 용어를 사용하며 친근하고 지지적인 어조를 표현해 주세요. (예: "{name}님의 매력은 정말 강렬한 자기 자신감이에요.")
2. **'뿌리가 깊은 나무의 리더십', '태양과 같은 표현력', '서로 힘들게 하는 흐름'** 등과 같이 비유적이고 통찰력 있는 언어를 사용하여 분석 내용을 깊이 있게 묘사해 주세요.
3. 단순한 나열이 아닌, **'왜 그런지'에 대한 이유와 '그래서 어떻게 해야 하는지'에 대한 조언**이 유기적으로 연결되는 서사적인 흐름을 갖춰서 작성해 주세요.
4. 반드시 '~해요'체를 사용할 것
5. **문체를 반드시 아래 예시처럼 말할 것:**
   "{name}님의 매력은 정말 강렬한 자기 자신감과 뚜렷한 개성이에요. 일간이 병으로 태양같은 이미지이고, 일지에 인이 있어서 언제 어디서나 자기 주장이 뚜렷하고, 주변 사람들에게 긍정적인 에너지를 퍼뜨려요."

### [전처리 및 사전 질문 통합 지침]
- **사전 질문 활용:** 고객이 입력한 연애 고민, 선호 이성 타입, 현재 상황 등의 내용을 **1장과 2장의 서두**에 인용하여 고객의 상황을 짚어주며 보고서의 개인 맞춤도를 높입니다.
- **캐릭터 상호작용 (다독임):** AI가 고객의 마음을 읽고 공감하며 명쾌한 해답을 제시하는 듯한 친근한 전문가의 느낌을 연출합니다.

### [보고서 작성 기본 규칙 및 문체]
1. **분량:** 각 풀이 항목은 정보의 깊이를 위해 충분한 분량(각 장 당 최소 2,000자 이상/전체 보고서는 총 10,000자 이상)으로 상세하게 작성합니다.
2. **전문 용어 활용:** 사주/관상 상의 핵심 개념(일간, 일지, 특정 오행, 십성)을 반드시 언급하고, 그 개념을 **일상적이고 간결한 언어와 비유**를 섞어 풀어서 설명합니다. 반드시 한자는 한글로 뜻과 음을 설명해줘야 합니다. (토스처럼 명료하게 핵심만 전달)
3. **외적/분위기 풀이 (비유법):** 외모, 첫인상, 매력 요소 등 **외부로 드러나는 부분**을 설명할 때는 **일상 속 구체적인 상황이나 사물에 빗댄 비유법**을 활용하여 감각적으로 표현합니다.
4. **성향/행동 풀이 (결과론적 풀이):** 연애 스타일, 강점, 약점 등 **내적인 성향이나 행동 패턴**을 설명할 때는 '사주 기운 때문에 결국 그런 결과로 이어질 수밖에 없다'는 **결과론적 풀이**를 강조하여 설득력을 높입니다.
5. **공감 표현:** 솔로 생활 중 또는 연애 시 고객이 자주 느낄 만한 고민이나 속마음을 이중 따옴표("...")를 사용하여 그대로 대변해 줍니다.
6. **어조:** **친근하고 신뢰감을 주는 전문가의 톤**을 유지하며, 문장은 명료하고 간결하게 구성합니다.
7. **사용 금지 표현 및 기호**: 고객에게 보여줄 최종 레포트이기에, '[속마음 공감]', '내용'과 같은 프롬프트 상의 지침들은 다 제외해야합니다. * 등의 특수기호는 절대 쓰지 않습니다. 그리고 "분석하여 제시합니다"와 같은 표현 너무 딱딱하고 AI 스러운 표현은 제외한다. 본문 흐름을 방해할 수 있는 '결과론적 풀이'와 같은 내부 소제목은 삭제하고, 전체 내용을 깔끔하게 이어서 보여줘야 한다.

---

# 4. [보고서 챕터별 상세 지침]

## [1장] 나도 몰랐던 내 사주 속 색기

**목표:** 고객의 사주와 관상을 분석하여 타고난 연애 잠재력과 이성에게 보이는 첫인상 이미지를 명확히 제시합니다.

### 풀이 1: 내 사주 팔자 분석
- **내용:** 일간, 오행의 강약, 십성의 분포를 분석하여 고객의 타고난 연애 에너지와 본질을 설명합니다.
- **지침:** 고객의 가장 강하거나 약한 오행을 짚어주고, 이것이 연애에서 어떤 특성(예: 표현력, 끈기, 주도성)으로 발현되는지 명리학적 근거를 들어 풀이합니다.

### 풀이 2: 나만이 가진 색기 - 도화살 분석
- **내용:** 사주 내 도화살(桃花殺), 홍염살(紅艶殺) 등 이성 매력 신살의 유무와 그 발현 정도를 분석합니다.
- **지침:** 단순히 신살 유무가 아닌, 이 기운이 어떤 종류의 매력(지적, 순수, 섹시 등)으로 나타나는지 구체적인 비유를 들어 설명하고, 이 매력이 이성 관계에서 어떻게 작용하는지 명리학적으로 분석합니다.

### 풀이 3: 나의 연애 스타일 (연애 강점, 약점, 선호하는 연애 스타일, 비선호 하는 연애 스타일)
- **내용:** 십성(十星)을 기반으로 한 고객의 연애 스타일(선호/비선호 스타일 포함), 강점, 약점을 결과론적으로 분석합니다.
- **지침:**
  - **강점/약점:** 양면적 풀이를 제공하고, 특히 약점은 "이 습관 때문에 결국 관계의 진전을 미루는 결과로 이어질 수 있다"는 인과적 표현을 사용합니다.
  - **공감:** 솔로 생활 중 겪었을 "내가 이렇게 신경 쓰는데, 왜 남들은 날 모르지?" 같은 속마음을 따옴표로 대변하여 공감대를 형성합니다.

## [2장] 나의 솔로 탈출 시기

**목표:** {year}년 운세를 분석하여 만남 시기를 예측하고, 그 상대방의 프로필을 상세히 제시합니다.

### 풀이 1: 언제 만날까? - 올해 연애 시기
- **내용:** 고객 명식과 {year}년 월별 운세에서 관성(官星, 여성의 배우자)/재성(財星, 남성의 배우자) 운이 강하게 들어오는 시기를 분석하여 솔로 탈출에 유리한 시기를 구체적으로 제시합니다.
- **지침:** 단순히 시기 예측이 아닌, 썸이 시작될 가능성이 높은 달과 연애로 확정될 가능성이 높은 달을 구분하여 명리학적 근거와 함께 제시합니다.

### 풀이 2: 인만추 vs 자만추 - 만나는 방식, 장소
- **내용:** 고객의 사주 원국을 분석하여 만남 방식(인만추/자만추)의 길흉을 제시하고, 운명의 상대가 주로 등장할 장소를 추천합니다.
- **지침:**
  - **만남 방식:** 사주를 기반으로 둘 중 어떤 방식이 고객에게 더 성공 확률이 높은지 명리학적 근거를 들어 명확히 제시합니다.
  - **장소 추천:** 주말 저녁 헬스장, 취미 스터디 등 목적이 명확한 유료 모임, 아침 영어회화 학원, 서점, 동호회, 동네 모임, 소모임 어플, 러닝크루/클라이밍/크로스핏 등 운동 모임 등 현실적이고 구체적인 장소를 제시하며 사주적 길함을 설명합니다.

### 풀이 3: 상대방 성격(MBTI)과 외모(초상화 제공, 풍기는 분위기, 옷 스타일, 키) 직업
- **내용:** 고객의 일지(日支) 및 관성/재성 분석을 통해 미래의 인연을 상세히 프로파일링합니다.
- **지침:**
  - **성격(MBTI):** 상대방의 십성 특성을 MBTI 유형 중 가장 유사한 유형으로 제시하며, 연애 시 나타날 행동 패턴을 설명합니다.
  - **외모(초상화 이미지):** 상대방의 오행 에너지 및 십성을 기반으로 풍기는 분위기, 옷 스타일, 키를 상세히 묘사하여 초상화처럼 상상할 수 있는 구체적인 묘사를 제공합니다. (비유법 활용 필수)
  - **직업:** 상대방의 십성이 가장 잘 발휘되는 직업군을 구체적인 예시와 함께 제시합니다.

### 풀이 4: 그 사람과의 연애 어떨까? (누가 먼저 좋아할까? 이번 연애는 얼마나 오래갈까? 결혼까지 그릴 수 있는 사람일까?)
- **내용:** 고객과 미래의 인연 간의 궁합과 관계의 전개를 예측하고, 고객의 핵심 고민에 답합니다.
- **지침:**
  - **관계 전개:** 누가 먼저 좋아할까, 이번 연애는 얼마나 오래갈까, 결혼까지 그릴 수 있는 사람일까에 대한 답변을 사주 충(沖)과 합(合)의 기운을 분석하여 예측합니다.
  - **공감:** 고객의 "이번 연애는 꼭 길었으면 좋겠다"는 간절한 속마음을 따옴표로 대변하여 공감하고 격려합니다.

### +그외 1가지 풀이 추가 제공: [심층 분석] 관계에서 주의해야 할 갈등 시그널 분석
- **내용:** 장기 연애 시 고객이 상대방과 겪게 될 가장 큰 갈등 상황을 예측하고, 이때 주의해야 할 경고 시그널을 제시합니다.
- **지침:** 고객의 사주 원국과 상대방의 십성이 충돌할 가능성이 높은 지점(예: 고집 충돌, 감정 과잉)을 구체적인 상황으로 제시하고, 관계를 유지하기 위한 조언을 명리학적 근거와 함께 명확히 제시합니다.

## [3장] 이성 필승 공략법

**목표:** 관상학적 개운법과 사주 기반 행동 강령을 제시하여, 고객의 매력도를 높이고 실제 연애 성공률을 높이는 실전 공략집을 제공합니다.

### 풀이 2: 이성 만나기 좋은 장소 추천
(관상학, 사주적으로 나에게 공통적으로 끌리는 이성은, 혹은 내가 좋아할만한 이성은 어디에 가야 있을까)
- **내용:** 고객의 사주/관상 분석을 통해 나에게 길한 오행과 매칭되는 이성 만나기 좋은 장소를 추천합니다.
- **지침:** 특정 장소 2-3곳을 언급하며, 해당 장소가 사주적/관상적으로 고객에게 왜 길한지를 명리학적 근거를 들어 명료하게 설명합니다. 고객의 나이대에 맞는 장소를 언급해야 합니다.

### 풀이 3: 나만의 무기가 될 플러팅 필승법과 행동 강령
(유형별 플러팅 방법: 첫데이트 장소 추천(관상학적으로 내 매력을 부각해줄만한 괜찮은 장소), 썸탈 때 전략, 성향 별 썸 성공법, 꼬시기 어려운 유형 공략법, 궁금한 여자 되는 법)
- **내용:** 고객의 사주와 관상을 기반으로 가장 효과적인 플러팅 전략과 상황별 조언을 제시합니다.
- **지침:**
  - **첫 데이트:** 관상학적으로 내 매력을 부각해줄 만한 괜찮은 장소를 제시합니다.
  - **행동 강령:** 고객의 사주 약점(1장 풀이 3)을 보완하는 방향으로, 나만의 무기가 될 플러팅 필승법과 행동 강령을 제시합니다.
  - **심화 전략:** 유형별 플러팅 방법, 썸탈 때 전략, 성향 별 썸 성공법, 꼬시기 어려운 유형 공략법, 궁금한 여자 되는 법 등 구체적인 상황별 솔루션을 제공합니다. 이때 고객의 자존감을 독려하고 응원하는 메시지를 포함하여 자기 효능감을 부여합니다.

### 풀이 4: 도화살 생기는 스타일 추천
- **내용:** 고객의 사주/관상 분석 결과와 가장 시너지를 낼 수 있는 패션/스타일을 추천합니다.
- **지침:** 가장 부족한 오행을 보충하거나, 가장 강한 오행을 극대화하는(예: 火 기운 부족 시 붉은 계열 포인트) 등의 구체적인 스타일링 팁을 명리학적 근거와 함께 제시합니다.

### + 그 외 풀이 추가 제공: 짝사랑/어장관리/썸에 휘둘리지 않는 멘탈 관리법
- **내용:** 고객이 짝사랑이나 어장관리/썸에 휘둘릴 때 멘탈을 관리하고 자존감을 높이는 방법을 조언합니다.
- **지침:**
  - **심리 분석:** 고객의 사주 약점이 이러한 상황에서 어떻게 부정적으로 작용하는지를 명리학적으로 짚어줍니다.
  - **조언:** 자기 확신을 높이는 구체적인 내면 관리법을 조언하며, 고객을 격려하며 마무리합니다.

## [4장] 사전 질문 답변

- **내용:** 고객의 사전 질문에 사주, 관상학적인 근거를 들어 심리상담 차원의 답변을 해줍니다.
- **지침:**
  - 고객의 심리를 분석하고 어루만져주는 이야기를 하며 질문의 본질을 파악합니다.
  - **조언:** 질문에 대한 해결법을 사주, 관상학적 근거를 들어 쉽게 설명합니다.
  - 이전 내용들에서 나온 답변들을 잘 정리해주고 거기에 추가적인 설명을 덧붙여 줍니다.

---

**중요**: 위의 모든 내용을 바탕으로, 친근하고 공감 가득한 전문가의 어조로 {name}님만을 위한 맞춤형 연애 사주 풀이를 작성해 주세요.
"""

    return prompt

@router.post("/analyze")
async def analyze_love_fortune(request: SajuLoveAnalysisRequest) -> Dict[str, Any]:
    """
    사주 데이터를 기반으로 Gemini AI를 통한 연애운 분석 + 이상형 이미지 생성
    """
    try:
        # 1. 텍스트 분석 프롬프트 생성
        prompt_text = build_love_prompt(
            saju_data=request.saju_data,
            user_name=request.user_name,
            user_concern=request.user_concern,
            year=request.year
        )

        # 2. Gemini API 호출 (텍스트 분석)
        print(f"[INFO] 텍스트 분석 시작...")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt_text,
            config={
                "temperature": 0.7,
                "top_p": 0.9,
                "max_output_tokens": 32000,
            }
        )

        # 응답 파싱
        analysis_text = response.text.strip()

        if not analysis_text:
            raise HTTPException(status_code=500, detail="AI 분석 결과를 생성할 수 없습니다.")

        # 챕터별로 분리
        chapters = parse_chapters(analysis_text)
        print(f"[INFO] 텍스트 분석 완료 ({len(chapters)}개 챕터)")

        # 3. 이상형 이미지 생성
        user_gender = request.saju_data.get("input", {}).get("gender", "male")
        image_base64 = None
        image_prompt_used = None
        partner_gender = None
        image_error = None  # 이미지 생성 실패 이유

        try:
            print(f"[INFO] 이미지 생성 시작... (사용자 성별: {user_gender})")

            # 이미지 프롬프트 생성
            image_prompt = build_ideal_partner_prompt(
                saju_data=request.saju_data,
                user_gender=user_gender
            )

            print(f"[INFO] Imagen 프롬프트: {image_prompt}")

            # Imagen 4 이미지 생성 API 호출
            image_response = client.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=image_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="3:4",
                    person_generation="allow_adult",
                )
            )

            if image_response.generated_images:
                generated_image = image_response.generated_images[0]
                image_bytes = generated_image.image.image_bytes
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                image_prompt_used = image_prompt
                partner_gender = "female" if user_gender == "male" else "male"
                print(f"[INFO] 이미지 생성 성공 (크기: {len(image_bytes)} bytes)")
            else:
                image_error = "이미지 생성 결과가 비어있습니다"
                print(f"[WARNING] 이미지 생성 실패 - {image_error}")

        except Exception as img_error:
            image_error = str(img_error)
            print(f"[WARNING] 이미지 생성 중 오류 (텍스트 분석은 계속 진행): {image_error}")

        # 이미지 결과 구성
        ideal_partner_image = None
        if image_base64:
            ideal_partner_image = {
                "success": True,
                "image_base64": image_base64,
                "prompt_used": image_prompt_used,
                "partner_gender": partner_gender
            }
        elif image_error:
            ideal_partner_image = {
                "success": False,
                "error": image_error,
                "prompt_used": image_prompt if 'image_prompt' in locals() else None
            }

        return {
            "success": True,
            "analysis": analysis_text,
            "chapters": chapters,
            "user_name": request.user_name or request.saju_data.get("input", {}).get("name") or "고객",
            "year": request.year,
            "ideal_partner_image": ideal_partner_image
        }

    except Exception as e:
        import traceback
        error_detail = f"분석 중 오류가 발생했습니다: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] {error_detail}")  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")



def build_ideal_partner_prompt(saju_data: Dict[str, Any], user_gender: str) -> str:
    """
    사주 데이터를 분석하여 이상형의 외모를 증명사진 스타일 영어 프롬프트로 생성
    한국인이 확실히 나오도록 강화된 프롬프트

    Args:
        saju_data: 사주 분석 결과
        user_gender: 사용자 성별 (이상형은 반대 성별로 생성)

    Returns:
        영어 프롬프트 문자열
    """
    partner_gender = "woman" if user_gender == "male" else "man"

    # 사주 분석에서 핵심 정보 추출
    five_elements = saju_data.get("fiveElements", {})
    pillars = saju_data.get("pillars", {})

    # 배우자궁(일지) 오행 확인
    day_pillar = pillars.get("day", {})
    day_branch = day_pillar.get("branch", {})
    spouse_element = day_branch.get("element", "").lower()

    # 오행 분포
    percent = five_elements.get("percent", {})
    strongest = max(percent, key=percent.get) if percent else "wood"
    weakest = min(percent, key=percent.get) if percent else "water"

    # 이상형 오행: 배우자궁 > 부족한 오행 > 강한 오행
    ideal_element = spouse_element if spouse_element else (weakest if weakest else strongest)
    ideal_element = ideal_element.lower()

    # 사주 오행별 한국인 얼굴 특징 (증명사진에 맞게 얼굴 위주)
    element_face = {
        "wood": {
            "face": "slim oval face with high cheekbones",
            "eyes": "gentle almond-shaped single or double eyelid eyes",
            "nose": "straight refined nose",
            "skin": "fair porcelain smooth skin",
            "hair": "neat straight black hair",
            "vibe": "calm intellectual scholarly aura"
        },
        "fire": {
            "face": "heart-shaped face with defined features",
            "eyes": "bright sparkling double-lidded eyes",
            "nose": "well-defined nose",
            "skin": "warm healthy glowing skin",
            "hair": "styled dark brown or black hair",
            "vibe": "charismatic confident idol-like aura"
        },
        "earth": {
            "face": "round soft friendly face",
            "eyes": "warm gentle eyes with natural lids",
            "nose": "soft rounded nose",
            "skin": "healthy natural skin tone",
            "hair": "natural black hair neatly styled",
            "vibe": "warm trustworthy approachable aura"
        },
        "metal": {
            "face": "angular face with sharp jawline",
            "eyes": "intense focused eyes with defined brows",
            "nose": "high straight nose bridge",
            "skin": "clear flawless pale skin",
            "hair": "sleek styled black hair",
            "vibe": "cool professional sophisticated aura"
        },
        "water": {
            "face": "soft flowing facial contours",
            "eyes": "deep mysterious dreamy eyes",
            "nose": "delicate soft nose",
            "skin": "smooth dewy glass-like skin",
            "hair": "soft flowing black hair",
            "vibe": "mysterious artistic ethereal aura"
        }
    }

    features = element_face.get(ideal_element, element_face["wood"])

    # 증명사진 스타일 프롬프트 구성
    if partner_gender == "woman":
        prompt_parts = [
            # 증명사진 형식 (최우선)
            "Korean passport ID photo",
            "formal headshot portrait of a Korean woman",
            "front facing camera directly",
            "head and shoulders visible",
            "plain solid white background",
            # 한국인 강조
            "100 percent Korean ethnicity",
            "authentic Korean female facial structure",
            "late 20s age",
            # 사주별 얼굴 특징
            features["face"],
            features["eyes"],
            features["nose"],
            features["skin"],
            features["hair"],
            features["vibe"],
            # 증명사진 설정
            "neutral calm expression",
            "professional studio lighting",
            "even lighting no shadows on face",
            "sharp focus",
            "formal clean appearance",
            "natural subtle Korean makeup",
            "photorealistic high resolution"
        ]
    else:
        prompt_parts = [
            # 증명사진 형식 (최우선)
            "Korean passport ID photo",
            "formal headshot portrait of a Korean man",
            "front facing camera directly",
            "head and shoulders visible",
            "plain solid white background",
            # 한국인 강조
            "100 percent Korean ethnicity",
            "authentic Korean male facial structure",
            "late 20s age",
            # 사주별 얼굴 특징
            features["face"],
            features["eyes"],
            features["nose"],
            features["skin"],
            features["hair"],
            features["vibe"],
            # 증명사진 설정
            "neutral calm expression",
            "professional studio lighting",
            "even lighting no shadows on face",
            "sharp focus",
            "formal clean appearance",
            "well groomed clean shaven",
            "photorealistic high resolution"
        ]

    return ", ".join(prompt_parts)