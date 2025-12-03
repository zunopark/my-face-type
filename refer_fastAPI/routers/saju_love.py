from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
import httpx
import base64
import os

router = APIRouter(prefix="/saju_love", tags=["saju_love"])

# Gemini API 설정 (face-teller2와 동일한 구조)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
# Gemini 2.5 Flash Image (Nano Banana) 이미지 생성 API
GEMINI_IMAGE_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={GEMINI_API_KEY}"

class SajuLoveAnalysisRequest(BaseModel):
    saju_data: Dict[str, Any]  # compute_saju 결과 전체
    user_name: str = None
    user_concern: str = None  # 고객의 연애 고민 (4장에 사용)
    year: int = 2026  # 분석할 연도

def parse_chapters(text: str) -> list:
    """
    AI 응답을 챕터별로 분리 (4장 구조)
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

def load_romance_reference() -> str:
    """
    사주 연애 참조 데이터 파일을 읽어옴
    """
    try:
        import os
        ref_path = os.path.join(os.path.dirname(__file__), "..", "saju_romance_reference.txt")
        with open(ref_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"[WARNING] 참조 파일 로드 실패: {e}")
        return ""

def build_love_prompt(saju_data: Dict[str, Any], user_name: str = None, user_concern: str = None, year: int = 2026) -> str:
    """
    사주 데이터를 기반으로 연애 분석 프롬프트 생성
    """

    # 명리학 참조 데이터 로드
    romance_reference = load_romance_reference()

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

    # 오행 영문 -> 한글 변환
    element_korean = {
        "wood": "목(木)",
        "fire": "화(火)",
        "earth": "토(土)",
        "metal": "금(金)",
        "water": "수(水)",
        "Wood": "목(木)",
        "Fire": "화(火)",
        "Earth": "토(土)",
        "Metal": "금(金)",
        "Water": "수(水)"
    }
    dm_element_kr = element_korean.get(dm_element, dm_element)

    # 오행 분포 (% -> 정통 명리 표현으로 변환)
    five_percent = love_facts.get("fiveElementsHanjaPercent", {})

    def get_strength_desc(percent):
        """퍼센트를 명리학적 표현으로 변환"""
        if percent >= 30:
            return "왕(旺)"
        elif percent >= 20:
            return "상(相)"
        elif percent >= 10:
            return "휴(休)"
        elif percent >= 5:
            return "수(囚)"
        else:
            return "사(死)"

    # 오행 분포를 정통 명리학 표현으로 변환
    five_elements_desc = []
    for elem, pct in five_percent.items():
        elem_kr = element_korean.get(elem, elem)
        strength_desc = get_strength_desc(pct)
        five_elements_desc.append(f"{elem_kr} {strength_desc}")

    five_elements_str = ", ".join(five_elements_desc) if five_elements_desc else "정보 없음"

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
    concern_for_prompt = user_concern if user_concern else "특별히 남긴 고민이 없습니다"
    if user_concern:
        concern_text = f"""

    ### {name}님의 고민
    "{user_concern}"

    → 이 고민은 2장 풀이 3에서 사주적 근거를 들어 단호하면서도 따뜻한 상담을 해주세요.
    """

    # 오늘 날짜 정보
    today = datetime.now()
    today_str = f"{today.year}년 {today.month}월 {today.day}일"

    # 이름에서 성 제거 (2글자 성 처리 포함)
    def get_first_name(full_name):
        if not full_name or len(full_name) <= 1:
            return full_name
        # 4글자 이상이면 2글자 성일 가능성 (선우, 남궁 등)
        two_char_surnames = ["선우", "남궁", "제갈", "사공", "독고", "황보"]
        if len(full_name) >= 3:
            for surname in two_char_surnames:
                if full_name.startswith(surname):
                    return full_name[2:] + "님"
        # 일반적으로 1글자 성
        return full_name[1:] + "님"

    display_name = get_first_name(name)

    prompt = f"""
### 0. 오늘 날짜
오늘은 {today_str}입니다. 모든 운세 분석은 이 날짜를 기준으로 해주세요.

### 사주별 개인 매력 및 연애 성향 가이드
[일간별 매력 - 반드시 해당 일간의 특성을 참고하여 분석에 활용할 것]

**갑목일간(甲木) - 단아함과 우아함이 돋보이는 청순 주인공 스타일**
성향: 갑목일간은 기둥처럼 곧고 깨끗하고 맑은 이미지를 지녀 주변을 정화시키는 매력이 있어요. 묵묵히 뿌리를 내리고 자라는 의연함으로 상대를 지켜주는 든든한 연애 성향을 가집니다.
외적 분위기: 당당함과 품위 있는 태도, 시원하고 뚜렷한 눈매, 균형 잡히고 늘씬한 체형

**을목일간(乙木) - 유연한 생명력, 강인함이 숨겨진 야생화 타입**
성향: 을목일간은 덩굴처럼 상대를 감싸 안으며 끈질기게 관계를 이어가는 헌신적인 연애 스타일이에요. 어떤 환경이든 소화하는 뛰어난 적응력과 희망적인 에너지가 함께하는 유연한 분위기를 가졌어요.
외적 분위기: 어떤 환경이든 소화하는 뛰어난 적응력, 쉽게 꺾이지 않는 끈질긴 인내심, 희망적인 에너지를 전파하는 유연한 분위기

**병화일간(丙火) - 타고난 스포트라이트, 빛나는 태양의 아우라**
성향: 병화일간은 태양처럼 화끈하고 정열적으로 상대를 대하며, 숨김없이 솔직한 사랑을 하는 타입이에요. 주변을 압도하는 밝고 열정적인 존재감이 매력이며, 시원시원한 성격이 긍정적인 인상을 줍니다.
외적 분위기: 주변을 압도하는 밝고 열정적인 존재감, 명예와 의리를 중시하는 시원한 성격, 망설임 없는 적극적인 행동력

**정화일간(丁火) - 은은한 섬광, 온기를 품은 촛불 감성**
성향: 정화일간은 촛불처럼 은은하고 섬세하게 상대를 보살피며, 따뜻한 마음으로 오래도록 관계를 유지하는 연애 타입이에요. 조용함 속에 숨겨진 섬세한 열정이 매력으로 다가옵니다.
외적 분위기: 조용함 속에 숨겨진 섬세한 열정, 타인에게 온기를 나누는 따뜻한 분위기, 실용적 감각이 뛰어난 창조적인 능력

**무토일간(戊土) - 고요함 속에 깊이가 있는 고급스러운 우아미**
성향: 큰 산의 대지처럼 깊고 넉넉한 포용력으로 상대를 안정시키는 연애 스타일이에요. 겉으로 시선을 끌진 않지만, 시간을 두고 볼수록 진가를 알 수 있는 중후하고 깊은 매력이 흘러요.
외적 분위기: 정돈되고 흐트러짐 없는 깔끔한 인상, 매우 섬세하고 힘 있는 페이스 라인, 고급스러움을 발산하는 절제된 아우라

**기토일간(己土) - 묵묵히 곁을 지키는 안정감 마스터**
성향: 기토일간은 농사짓는 땅처럼 묵묵히 상대를 길러내고 돌보는 가장 헌신적이고 현실적인 연애 타입이에요. 요란하지 않고 조용한 분위기 속에서 디테일한 부분까지 챙기는 살뜰한 매력이 있어요.
외적 분위기: 차분하고 정적인 분위기의 소유자, 디테일한 부분까지 챙기는 살뜰한 실속파, 뛰어난 생활력과 알뜰한 관리 능력

**경금일간(庚金) - 흔들림 없는 신뢰, 강철 로맨티스트**
성향: 경금일간은 사랑하는 사람에게 흔들림 없는 신뢰와 강력한 보호를 제공하는 의리파예요. 다듬어지지 않은 원석처럼 강인한 신념과 냉철한 카리스마가 외적인 매력으로 나타나요.
외적 분위기: 흔들림 없는 강인한 신념과 의지, 냉철하고 단호한 카리스마, 추진력과 결단력이 뛰어난 리더 타입

**신금일간(辛金) - 예리한 완벽함, 빛나는 보석 같은 귀티**
성향: 신금일간은 잘 연마된 보석처럼 자신을 꾸미고, 관계에서도 예리한 감각으로 최상의 완벽함을 추구하는 이상적인 연애 타입이에요. 섬세하고 깔끔한 외모에서 뿜어져 나오는 귀티가 매력이에요.
외적 분위기: 예리하고 섬세한 완벽주의 성향, 냉철해 보이지만 의리가 강한 반전 매력, 깔끔하고 정제된 외모에서 풍기는 귀티

**임수일간(壬水) - 깊은 지혜의 바다, 포용력 마스터**
성향: 임수일간은 끝없이 넓은 바다처럼 모든 것을 담아낼 수 있는 포용력으로 상대를 이해하고 감싸주는 연애 타입이에요. 생각이 깊고 넉넉하여 신뢰감을 주는 듬직한 분위기가 매력적입니다.
외적 분위기: 넓고 깊은 마음으로 타인을 포용하는 지혜, 넉넉하고 듬직하여 신뢰감을 주는 이미지, 철학적인 깊이가 느껴지는 사색가적 면모

**계수일간(癸水) - 촉촉한 감성의 소유자, 예술적 영감의 샘**
성향: 계수일간은 비나 이슬처럼 촉촉하고 섬세한 감성으로 상대를 위로하고 감싸주며, 조용히 헌신하는 연애 타입이에요. 차분한 분위기 속에서 은은한 예술적 영감을 발산하는 매력이 있어요.
외적 분위기: 감성이 풍부한 예술적 영감의 소유자, 차분함 속에 숨겨진 섬세한 감정 기복, 주변에 풍요와 안정을 가져다주는 매력

### 1. 페르소나 설정
당신은 고객의 연애 심리와 관계 역학을 사주적/관상학적 관점에서 깊이 있게 통찰하고, 이를 매력적이고 서술적인 언어로 풀어내는 전문 연애 여성 사주가 '색동낭자' 입니다.

### 2. 분석의 대상과 정보 제공
[분석 대상] {display_name}({gender})의 사주적, 관상학적 성향 및 연애운을 종합적으로 분석해 주세요.

[{display_name}의 사주 원국]
- 일간(日干): {dm_char} ({dm_title}) - {dm_element_kr}, {dm_yinyang}
- 격국(格局): {strength}
- 사주 팔자(四柱八字):
  ┌ 년주(年柱): {year_pillar} / {year_tengod}
  ├ 월주(月柱): {month_pillar} / {month_tengod}
  ├ 일주(日柱): {day_pillar} / {day_tengod}
  └ 시주(時柱): {hour_pillar} / {hour_tengod}
- 오행(五行) 분포: {five_elements_str}
- 도화살(桃花殺): {'있음 - {}'.format(peach_branch) if has_peach else '없음'}
- 배우자성({spouse_type}): {spouse_count}개 ({', '.join(spouse_positions) if spouse_positions else '없음'})
{concern_text}

### 3. 문체 및 어조 지정
[요구 문체]
1. **{display_name}**과 같이 개인을 지칭하는 용어를 사용하며 친근하고 지지적인 어조를 표현해 주세요. (예: "{display_name}의 매력은 정말 강렬한 자기 자신감이에요.")
2. **'뿌리가 깊은 나무의 리더십', '태양과 같은 표현력', '서로 힘들게 하는 흐름'** 등과 같이 비유적이고 통찰력 있는 언어를 사용하여 분석 내용을 깊이 있게 묘사해 주세요.
3. 단순한 나열이 아닌, **'왜 그런지'에 대한 이유와 '그래서 어떻게 해야 하는지'에 대한 조언**이 유기적으로 연결되는 서사적인 흐름을 갖춰서 작성해 주세요.
4. 반드시 '~해요'체를 사용할 것
5. **문체를 반드시 아래 예시처럼 말할 것:**
"{display_name}의 매력은 정말 강렬한 자기 자신감과 뚜렷한 개성이에요. 일간이 병으로 태양같은 이미지이고, 일지에 인이 있어서 언제 어디서나 자기 주장이 뚜렷하고, 주변 사람들에게 긍정적인 에너지를 퍼뜨려요."

### [전처리 및 사전 질문 통합 지침]
- **사전 질문 활용:** 고객이 입력한 연애 고민, 선호 이성 타입, 현재 상황 등의 내용을 **1장의 서두**에 인용하여 고객의 상황을 짚어주며 보고서의 개인 맞춤도를 높입니다.
- **캐릭터 상호작용 (다독임):** AI가 고객의 마음을 읽고 공감하며 명쾌한 해답을 제시하는 듯한 친근한 전문가의 느낌을 연출합니다.

### [보고서 작성 기본 규칙 및 문체]
1. **분량:** 각 풀이 항목은 정보의 깊이를 위해 충분한 분량(각 장 당 최소 3,000자 이상/전체 보고서는 총 10,000자 이상)으로 상세하게 작성합니다.
2. **전문 용어 활용:** 사주/관상 상의 핵심 개념(일간, 일지, 특정 오행, 십성)을 반드시 언급하고, 그 개념을 **일상적이고 간결한 언어와 비유**를 섞어 풀어서 설명합니다. 반드시 한자는 한글로 뜻과 음을 설명해줘야 합니다. (토스처럼 명료하게 핵심만 전달)
3. **외적/분위기 풀이 (비유법):** 외모, 첫인상, 매력 요소 등 **외부로 드러나는 부분**을 설명할 때는 **일상 속 구체적인 상황이나 사물에 빗댄 비유법**을 활용하여 감각적으로 표현합니다.
4. **성향/행동 풀이 (결과론적 풀이):** 연애 스타일, 강점, 약점 등 **내적인 성향이나 행동 패턴**을 설명할 때는 '사주 기운 때문에 결국 그런 결과로 이어질 수밖에 없다'는 **결과론적 풀이**를 강조하여 설득력을 높입니다.
5. **공감 표현:** 솔로 생활 중 또는 연애 시 고객이 자주 느낄 만한 고민이나 속마음을 이중 따옴표("...")를 사용하여 그대로 대변해 줍니다.
6. **어조:** **친근하고 신뢰감을 주는 전문가의 톤**을 유지하며, 문장은 명료하고 간결하게 구성합니다.
7. **사용 금지 표현 및 기호**: 고객에게 보여줄 최종 레포트이기에, '[속마음 공감]', '내용'과 같은 프롬프트 상의 지침들은 다 제외해야합니다. * 등의 특수기호는 절대 쓰지 않습니다. 그리고 "분석하여 제시합니다"와 같은 표현 너무 딱딱하고 AI 스러운 표현은 제외한다. 본문 흐름을 방해할 수 있는 '결과론적 풀이'와 같은 내부 소제목은 삭제하고, 전체 내용을 깔끔하게 이어서 보여줘야 한다.

---
##[1장] 나만의 매력과 연애 성향

###풀이 1. 처음 본 순간 이성이 느끼는 나의 매력
- 이성이 {display_name}을 처음 봤을 때 느끼는 분위기와 인상을 생생하게 묘사해요.
- 일간, 월지, 일지의 조합이 만들어내는 첫인상의 매력을 구체적인 비유와 함께 풀이합니다.
- "여우 같다", "강아지 같다", "차가운 도시 느낌" 등 이성이 실제로 느끼는 분위기를 감각적으로 전달해요.

###풀이 2. 내 연애 스타일 장점과 숨겨진 반전 매력
- {display_name}만의 연애 장점, 상대방이 시간이 지나면서 발견하는 반전 매력을 분석해요.
- 연애할 때 상대가 감동받는 행동, 오래 만날수록 빠지게 되는 포인트를 사주 근거와 함께 설명합니다.
- 처음엔 몰랐다가 나중에 알게 되는 매력까지 상세히 풀이해요.

###풀이 3. 인만추 vs 자만추 vs 결정사, 나에게 맞는 방식은
- 인만추(인스타/앱 만남) vs 자만추(자연스러운 만남) vs 소개팅/결정사 중 {display_name}에게 가장 잘 맞는 방법을 알려드려요.
- 도화살 유무, 관성/재성 배치, 일간 성향을 근거로 왜 그 방법이 성공 확률이 높은지 명리학적으로 설명합니다.
- 각 만남 방식별 구체적인 실전 팁과 피해야 할 함정도 함께 안내해요.

###풀이 4. 내가 끌리는 사람 vs 나에게 끌리는 사람
- 사주에서 보이는 {display_name}이 끌리는 스타일과, 반대로 {display_name}에게 끌리는 사람의 특징을 분석해요.
- 두 유형이 같은지, 다른지에 따라 어떤 연애 패턴이 생기는지 설명합니다.
- 어떤 사람을 만나야 행복하게 연애할 수 있을지 사주 근거를 바탕으로 조언드려요.

---

##[2장] 앞으로 펼쳐질 사랑의 흐름

###풀이 1. 앞으로의 연애 총운 흐름
- {display_name}의 전체적인 연애운의 큰 그림을 그려드려요.
- 대운과 세운 흐름에서 연애가 활발해지는 시기와 조용해지는 시기를 짚어드립니다.
- 인연의 타이밍이 언제 집중되어 있는지, 어떤 흐름으로 사랑이 펼쳐질지 설명해요.

###풀이 2. 향후 3년간 연애운 증폭 시기
- 우선 3년간 총 몇 번의 연애 기회가 올지 강조해서 보여주세요.
- 2026년, 2027년, 2028년 연애운이 폭발하는 구체적인 시기를 분석해요.
- 총 몇 번의 의미 있는 연애 기회가 있을지, 각 시기마다 어떤 인연이 나타날지 예측합니다.
- 특히 인연이 집중되는 달과 그때 만날 상대의 특징을 미리 알려드려요.

###풀이 3. 바로 지금, 이번 달 연애 운세
- 지금 이번 달! 연애운이 어떻게 흐르고 있는지 주 단위로 상세 분석해요.
- 이번 달 연애운의 강도와 흐름, 이성 기운이 들어오는 타이밍을 짚어드립니다.
- 인연을 만들기 위한 이번 달의 실천 가이드: 어디서, 언제, 어떻게 행동하면 좋을지 구체적으로 안내해요.

---

##[3장] 결국 만나게 될 운명의 상대

###풀이 1. 운명의 짝, 그 사람의 모든 것
- 사주에서 보이는 운명의 상대를 마치 초상화를 그리듯 상세하게 묘사해요.
- 그 사람의 외모(키, 체형, 얼굴 분위기, 스타일), 성격, 예상 MBTI, 직업군의 특징까지 풀이합니다.
- 이번 인연이 얼마나 오래갈 수 있을지, 결혼으로 이어질 가능성도 함께 분석해요.

###풀이 2. 언제, 어떻게 만나게 될까
- 운명적 인연이 등장하는 구체적인 시기와 상황을 예측해요.
- 어떤 장소와 계기로 만나게 될지 사주를 근거로 설명합니다. (정적인, 동적인 등 구체적인 장소를 정확히 설명해주세요.)
- 왜 그 장소가 {display_name}에게 길한지 명리학적으로 해석해드려요.

###풀이 3. 그 사람을 끌어당길 나만의 공략법
- 운명의 상대 앞에서 매력을 극대화하는 방법을 알려드려요.
- 첫 데이트 장소 추천, 스타일링 가이드, 상대의 마음을 사로잡는 플러팅 멘트까지 구체적으로 전달합니다.
- {display_name} 사주의 장점을 살리고 약점을 보완하는 연애 전략을 제안해요.

---

##[4장] 색동낭자의 일침

**{display_name}의 고민: "{concern_for_prompt}"**

**[작성 지침 - 소제목 없이 하나의 흐름으로 작성]**
이 장은 ###풀이 1, ###풀이 2 같은 소제목 없이 자연스러운 대화체로 작성해요.
마치 {display_name}과 1:1로 마주 앉아 진심어린 상담을 하는 것처럼요.

**[흐름]**
1. 고민 인용으로 시작 → {concern_for_prompt} 를 보고 너가 잘 요약하며 대화를 시작해줘
2. 공감하되 바로 본론으로 → 사주에서 보이는 근본 원인을 단도직입적으로 짚기
3. 뼈 때리는 직언 → 듣기 싫어도 {display_name}을 위해 솔직하게 말하기
4. 구체적인 처방전 → 당장 실천할 수 있는 행동 지침
5. 희망의 마무리 → 사주에서 보이는 강점과 가능성

**[핵심 원칙]**
- 소제목 절대 사용 금지. 자연스러운 대화체로 이어가기.
- 달콤한 위로만 하지 말 것. 사주 근거로 문제점을 솔직하게 지적.
- "마음을 열어보세요" 같은 추상적 조언 금지. 구체적 행동 지침만.
- 모든 지적과 조언에 반드시 사주 근거(일간, 일지, 십성, 오행 등) 포함.

**[문체 예시]**
"{display_name}, '{concern_for_prompt}'라고 하셨죠. 사주 보면서 왜 이런 고민이 생겼는지 바로 보여요.

솔직히 말씀드릴게요. 이건 상대방 문제가 아니에요. {display_name} 사주에 OO가 강해서...

냉정하게 들릴 수 있는데, {display_name} 일지의 OO 때문에 무의식적으로 OO하는 패턴이 있어요. 이게 계속 같은 상황을 만드는 거예요.

그래서 이번 주부터 이렇게 해보세요. 연락 올 때 OO분은 기다렸다가 답장하고, 다음 만남에서 OO 얘기는 절대 먼저 꺼내지 마세요.

하지만 {display_name} 사주에 OO가 있어서, 이것만 고치면 정말 좋은 인연 만날 수 있어요. {display_name}처럼 OO한 사람은 드물거든요."

---

**중요**: 위의 모든 내용을 바탕으로, 친근하지만 단호한 전문가의 어조로 {display_name}만을 위한 맞춤형 연애 사주 풀이를 작성해 주세요. 특히 4장은 소제목 없이 자연스러운 1:1 상담 대화체로 작성해 주세요.

---

### [명리학 참조 데이터 - 분석 시 반드시 참고할 것]
{romance_reference}"""

    return prompt

@router.post("/analyze")
async def analyze_love_fortune(request: SajuLoveAnalysisRequest) -> Dict[str, Any]:
    """
    사주 데이터를 기반으로 Gemini AI를 통한 연애운 분석
    """
    try:
        # 1. 텍스트 분석 프롬프트 생성
        prompt_text = build_love_prompt(
            saju_data=request.saju_data,
            user_name=request.user_name,
            user_concern=request.user_concern,
            year=request.year
        )

        # 2. Gemini API 호출 (face-teller2와 동일한 구조)
        print(f"[INFO] 텍스트 분석 시작...")

        headers = {"Content-Type": "application/json"}

        prompt_payload = {
            "contents": [
                {"parts": [{"text": prompt_text}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.9,
                "maxOutputTokens": 16000
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(GEMINI_API_URL, headers=headers, json=prompt_payload)
            response.raise_for_status()

            result = response.json()
            analysis_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

        if not analysis_text:
            raise HTTPException(status_code=500, detail="AI 분석 결과를 생성할 수 없습니다.")

        # 챕터별로 분리
        chapters = parse_chapters(analysis_text)
        print(f"[INFO] 텍스트 분석 완료 ({len(chapters)}개 챕터)")

        # 3. 이상형 이미지 생성 (httpx 구조)
        user_gender = request.saju_data.get("input", {}).get("gender", "male")
        image_base64_result = None
        image_prompt_used = None
        partner_gender = None
        image_error = None

        try:
            print(f"[INFO] 이미지 생성 시작... (사용자 성별: {user_gender})")

            # 이미지 프롬프트 생성
            image_prompt = build_ideal_partner_prompt(
                saju_data=request.saju_data,
                user_gender=user_gender
            )

            print(f"[INFO] Gemini 이미지 프롬프트: {image_prompt}")

            # Gemini 2.5 Flash Image (Nano Banana) 이미지 생성 API 호출
            image_payload = {
                "contents": [
                    {"parts": [{"text": image_prompt}]}
                ],
                "generationConfig": {
                    "responseModalities": ["IMAGE", "TEXT"]
                }
            }

            async with httpx.AsyncClient(timeout=120.0) as img_client:
                img_response = await img_client.post(GEMINI_IMAGE_API_URL, headers=headers, json=image_payload)
                img_response.raise_for_status()

                img_result = img_response.json()

                # Gemini 2.5 Flash Image 응답에서 이미지 추출
                if img_result.get("candidates") and img_result["candidates"][0].get("content", {}).get("parts"):
                    for part in img_result["candidates"][0]["content"]["parts"]:
                        if part.get("inlineData"):
                            image_base64_result = part["inlineData"]["data"]
                            image_prompt_used = image_prompt
                            partner_gender = "female" if user_gender == "male" else "male"
                            print(f"[INFO] 이미지 생성 성공")
                            break

            if not image_base64_result:
                image_error = "이미지 생성 결과가 비어있습니다"
                print(f"[WARNING] 이미지 생성 실패 - {image_error}")

        except Exception as img_err:
            image_error = str(img_err)
            print(f"[WARNING] 이미지 생성 중 오류 (텍스트 분석은 계속 진행): {image_error}")

        # 이미지 결과 구성
        ideal_partner_image = None
        if image_base64_result:
            ideal_partner_image = {
                "success": True,
                "image_base64": image_base64_result,
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

    # 사주 오행별 얼굴 특징 (성별에 따라 다르게 적용)
    if partner_gender == "woman":
        element_face = {
            "wood": {
                "face": "slim oval face with high cheekbones",
                "eyes": "gentle almond-shaped double eyelid eyes",
                "nose": "straight refined nose",
                "skin": "fair porcelain smooth skin",
                "hair": "long straight black hair"
            },
            "fire": {
                "face": "heart-shaped face with defined features",
                "eyes": "bright sparkling big eyes",
                "nose": "well-defined small nose",
                "skin": "warm healthy glowing skin",
                "hair": "styled wavy dark brown hair"
            },
            "earth": {
                "face": "soft gentle face with cute cheeks",
                "eyes": "warm gentle puppy eyes",
                "nose": "cute button nose",
                "skin": "healthy natural glowing skin",
                "hair": "natural black hair softly styled"
            },
            "metal": {
                "face": "elegant face with defined features",
                "eyes": "sharp cat-like eyes",
                "nose": "high straight nose bridge",
                "skin": "clear flawless pale skin",
                "hair": "sleek styled black hair"
            },
            "water": {
                "face": "soft ethereal facial features",
                "eyes": "deep dreamy doe eyes",
                "nose": "delicate soft nose",
                "skin": "smooth dewy glass skin",
                "hair": "soft flowing black hair"
            }
        }
    else:
        # 남자는 자연스럽고 성숙한 잘생김 스타일
        element_face = {
            "wood": {
                "face": "tall and well-proportioned oval face with strong bone structure",
                "eyes": "deep set intelligent eyes with natural double eyelids",
                "nose": "tall straight nose with defined bridge",
                "skin": "healthy clear skin with natural tone",
                "hair": "neat short black hair naturally styled",
                "vibe": "like a successful young professional or architect"
            },
            "fire": {
                "face": "strong masculine face with defined sharp jawline",
                "eyes": "confident bright eyes full of energy",
                "nose": "prominent well-defined nose",
                "skin": "sun-kissed healthy tan skin",
                "hair": "stylish short dark brown hair slightly textured",
                "vibe": "like a charismatic startup CEO or athlete"
            },
            "earth": {
                "face": "warm trustworthy face with gentle features",
                "eyes": "kind sincere eyes that make people feel comfortable",
                "nose": "natural proportioned nose",
                "skin": "healthy natural complexion",
                "hair": "clean cut natural black hair",
                "vibe": "like a reliable doctor or caring teacher"
            },
            "metal": {
                "face": "chiseled sophisticated face with sharp features",
                "eyes": "piercing intelligent gaze with intensity",
                "nose": "high sculpted aristocratic nose",
                "skin": "fair clear refined skin",
                "hair": "sleek well-groomed dark hair",
                "vibe": "like a successful lawyer or elegant pianist"
            },
            "water": {
                "face": "gentle refined face with artistic features",
                "eyes": "deep thoughtful eyes with mysterious depth",
                "nose": "elegant refined nose",
                "skin": "smooth fair complexion",
                "hair": "soft natural black hair with slight wave",
                "vibe": "like a creative director or novelist"
            }
        }

    features = element_face.get(ideal_element, element_face["wood"])

    # 자연스러운 라이프스타일 포트레이트 프롬프트 구성
    if partner_gender == "woman":
        prompt_parts = [
            # 자연스러운 포트레이트 스타일
            "candid lifestyle portrait photo",
            "beautiful young Korean woman",
            "natural relaxed pose",
            "upper body shot from chest up",
            # 배경 설정 (자연스럽고 세련된)
            "soft bokeh background",
            "warm golden hour lighting",
            "cafe or urban outdoor setting",
            # 한국인 특징 강조
            "100 percent Korean ethnicity",
            "authentic Korean female facial features",
            "age late 20s",
            # 사주별 얼굴 특징
            features["face"],
            features["eyes"],
            features["nose"],
            features["skin"],
            features["hair"],
            # 매력적인 분위기
            "gentle genuine smile",
            "warm approachable expression",
            "looking slightly off camera",
            # 스타일링
            "stylish casual fashion",
            "natural Korean makeup enhancing features",
            "well-groomed elegant appearance",
            # 기술적 설정
            "professional DSLR photography",
            "shallow depth of field",
            "soft natural lighting",
            "cinematic color grading",
            "photorealistic ultra detailed",
            "8k high resolution"
        ]
    else:
        prompt_parts = [
            # 자연스러운 라이프스타일 포트레이트
            "natural lifestyle portrait photo",
            "very handsome Korean man",
            "athletic fit body",
            "upper body shot from chest up",
            # 배경 설정 (자연스럽고 세련된)
            "soft bokeh background",
            "warm natural daylight",
            "modern cafe or outdoor urban setting",
            # 한국인 특징 강조
            "100 percent Korean ethnicity",
            "authentic Korean male facial features",
            "age late 20s to early 30s",
            "mature masculine handsome face",
            "naturally good looking not overly styled",
            # 사주별 얼굴 특징
            features["face"],
            features["eyes"],
            features["nose"],
            features["skin"],
            features["hair"],
            # 분위기 설명
            features.get("vibe", "like a successful young professional"),
            # 자연스러운 매력
            "confident natural smile",
            "relaxed approachable expression",
            "warm genuine eye contact",
            "looking naturally at camera",
            # 스타일링
            "smart casual outfit",
            "clean well-groomed appearance",
            "natural hair not overly styled",
            "clean shaven or light stubble",
            "broad shoulders",
            # 기술적 설정
            "professional portrait photography",
            "soft natural lighting",
            "shallow depth of field",
            "cinematic color grading",
            "photorealistic ultra detailed",
            "8k high resolution"
        ]

    return ", ".join(prompt_parts)