from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from google import genai
from google.genai import types
from datetime import datetime
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
    if user_concern:
        concern_text = f"""

    ### {name}님의 고민
    "{user_concern}"

    → 이 고민은 4장에서 사주/관상학적 근거를 들어 심리상담 차원에서 답변해 주세요.
    """

    # 오늘 날짜 정보
    today = datetime.now()
    today_str = f"{today.year}년 {today.month}월 {today.day}일"

    prompt = f"""
        ### 0. 오늘 날짜
        오늘은 {today_str}입니다. 모든 운세 분석은 이 날짜를 기준으로 해주세요.

        ### 1. 페르소나 설정
        당신은 고객의 연애 심리와 관계 역학을 사주적/관상학적 관점에서 깊이 있게 통찰하고, 이를 매력적이고 서술적인 언어로 풀어내는 전문 연애 여성 사주가 '색동낭자' 입니다.

        ### 2. 분석의 대상과 정보 제공
        [분석 대상] {name}님({gender})의 사주적, 관상학적 성향 및 연애운을 종합적으로 분석해 주세요.

        [{name}님의 사주 원국]
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
        0. 내담자를 부를 때는 성을 뺴고 불러줘. 예를 들면, 윤용섭은 "용섭님" 이라고 부르면 되고 선우성진 등 4글자인데 2글자 성을 갖고 있는 사람은 "성진님" 이라고 부르면 돼
        1. **분량:** 각 풀이 항목은 정보의 깊이를 위해 충분한 분량(각 장 당 최소 2,000자 이상/전체 보고서는 총 10,000자 이상)으로 상세하게 작성합니다.
        2. **전문 용어 활용:** 사주/관상 상의 핵심 개념(일간, 일지, 특정 오행, 십성)을 반드시 언급하고, 그 개념을 **일상적이고 간결한 언어와 비유**를 섞어 풀어서 설명합니다. 반드시 한자는 한글로 뜻과 음을 설명해줘야 합니다. (토스처럼 명료하게 핵심만 전달)
        3. **외적/분위기 풀이 (비유법):** 외모, 첫인상, 매력 요소 등 **외부로 드러나는 부분**을 설명할 때는 **일상 속 구체적인 상황이나 사물에 빗댄 비유법**을 활용하여 감각적으로 표현합니다.
        4. **성향/행동 풀이 (결과론적 풀이):** 연애 스타일, 강점, 약점 등 **내적인 성향이나 행동 패턴**을 설명할 때는 '사주 기운 때문에 결국 그런 결과로 이어질 수밖에 없다'는 **결과론적 풀이**를 강조하여 설득력을 높입니다.
        5. **공감 표현:** 솔로 생활 중 또는 연애 시 고객이 자주 느낄 만한 고민이나 속마음을 이중 따옴표("...")를 사용하여 그대로 대변해 줍니다.
        6. **어조:** **친근하고 신뢰감을 주는 전문가의 톤**을 유지하며, 문장은 명료하고 간결하게 구성합니다.
        7. **사용 금지 표현 및 기호**: 고객에게 보여줄 최종 레포트이기에, '[속마음 공감]', '내용'과 같은 프롬프트 상의 지침들은 다 제외해야합니다. * 등의 특수기호는 절대 쓰지 않습니다. 그리고 "분석하여 제시합니다"와 같은 표현 너무 딱딱하고 AI 스러운 표현은 제외한다. 본문 흐름을 방해할 수 있는 '결과론적 풀이'와 같은 내부 소제목은 삭제하고, 전체 내용을 깔끔하게 이어서 보여줘야 한다.

        ---
        ##[1장] 나의 연애 총운 개요

        ###1. 평생 연애 총운 흐름  
        - 당신이 앞으로 겪게 될 연애 흐름 전반을 간략하게 설명해 드려요.  
        - 타고난 연애 기질, 인연의 전반적인 맥락과 주요 연령대별 변화, 평균적인 연애 기회와 만족도의 흐름, 인생 단계마다 찾아오는 연애와 결혼운의 변화, 각 시기별로 나타날 수 있는 대표적 에피소드(첫사랑, 이별, 결혼, 재회 등)를 실제적인 예시와 명리학적 근거로 풀어 드립니다.

        ###2. 앞으로 3년, 정확한 연애운 폭발 시기 
        - 향후 3년간 (2026년,2027년,2028년) 특별히 연애운이 강해지는 해·월·계절, 실제 연애 기회가 집중된 타이밍(예: 2026년 1~3월, 2026년 8~10월 등)을 구체적으로 짚어드려요.  
        - 각 기회마다 등장할 유형(외모, 분위기, MBTI, 말투·행동 스타일 등)을 간단하게, 실제 어떤 상황에서 만날지(소개팅, 직장, 취미 등)도 실생활 연결적으로 설명합니다.  
        - 기회를 살릴 방법, 놓치지 않아야 할 타이밍, 그 시기별로 조심해야 할 점 등 명리학적 조언을 추가합니다.

        ###3. 바로 지금, 이번 달 연애 운세  
        - 이번 달 사주상 연애운의 흐름(이성이 들어오는 기운의 유무, 강약, 주간별로 변화 등)을 월운, 일간 기운을 분석하여 디테일하게 제시합니다.  
        - 연애 기회를 늘릴 수 있는 구체적인 행동법, 현실적인 장소(예: 토요일 저녁 카페 모임 참석, 월말 회식 자리, 지인소개 등)도 2~3가지 실제 제안과 함께 알려드려요.

        ---

        ##[2장] 나의 사주팔자와 매력

        ###1. 나의 타고난 매력, 이성이 느끼는 나의 첫인상  
        - 일간(본질)과 얼굴 관상을 조합해 누구나 처음 보는 첫인상이 어떤 느낌일지, “두부상”, “여우상” 등 친근한 비유와 함께 풀어 설명합니다.  
        - (앱인토스 프사 관상 프롬프트를 기반으로, 연애와 외적 표현에서 긍정적인 말로 구체적으로 묘사)  
        - 실제 연애 상황에서 상대가 느끼는 매력 포인트와 인상적인 첫 마디·분위기를 포함합니다.

        ###2. 내 연애 성향 장점과 반전매력  
        - 십성, 오행 배치, 일지/월지 분석을 토대로 연애에서 무의식적으로 작동하는 장점과 숨어 있는 매력을 설명합니다.  
        - 시간이 흐를수록 상대가 발견하게 되는 깊은 반전매력, 실제 연애나 소개팅/관계에서 감동을 주는 행동·대화를 예로 들어 전달해요.

        ###3. 인만추 vs 자만추 vs 결정사, 나에게 맞는 방법  
        - 사주상 인연 유입 코드(도화살, 관성·재성, 기운 분포 등)를 근거로 세 가지 만남 유형 중에서 가장 성공 확률이 높은 방식·구체적 상황, 나에게 맞는 이유를 상세히 풀이합니다.  
        - 각각의 만남 방식별 실전 팁과 권장 행동, 반대로 피해야 할 환경을 실제 경험/사례와 연결해서 제안해요.

        ###4. 내가 좋아하는 사람? vs 나를 좋아하는 사람?  
        - 사주 기질과 연애 성향을 토대로 내가 먼저 끌리는 타입과 나를 선호하는 타입의 장단점·행복 만족도를 비교합니다.  
        - “어떤 연애에서 가장 오래가고, 덜 후회하는지”, 내 연애 목표(결혼/즐거움/새로움 등)와 맞춤형 권장안을 명리학적으로 안내합니다.

        ---

        ##[3장] 나의 운명의 상대

        ###1. 내 운명의 짝은 어떤 사람일까?  
        - 사주(일지/관성/재성/도화살)와 관상을 기반으로 가장 가능성 높은 이상형의 구체적인 외모(분위기, 키, 체형, 미소 등), MBTI·대표 성향, 습관적 행동 등의 디테일한 묘사를 해요.  
        - 실제 이상형 사진(초상화) 프롬프트 수준의 설명, 오행 조화 및 십성 해석과 자연스럽게 연결해주세요.

        ###2. 언제, 어떻게 만나게 될까?  
        - 운세 흐름상 인연이 등장하는 시점, 현실적으로 마주칠 가능성이 높은 상황(예: 클라이밍장, 독서모임, 소개팅, 취미모임 등)과 구체적인 계절·시간대·행동 루트를 안내합니다.  
        - 사주상 왜 그 장소가 길하고 추천되는지도 명리학적으로 해석해요.

        ###3. 그 사람을 꼬시는 나만의 공략법  
        - 첫인상에 어울리는 옷차림/화장, 플러팅 멘트, 스타일링, 데이트 추천 코스 등 실전 행동 조언을 줍니다.  
        - 나의 사주 약점(감정 표현, 신중함 등)이 연애에서 어떤 식으로 보완되면 좋은지, 상대의 마음을 끌 수 있는 대사·태도 등까지 구체적으로 설명하세요.

        ###4. 썸붕 극복, 재회 공략법  
        - 썸이나 연애에서 예상되는 위기의 원인(사주 기질, 상대와의 궁합 등)을 중심으로, 이별/권태/썸붕 상황에서 대처법(멘탈 관리, 재회 전략, 새로운 만남 준비 등)을 실질적으로 안내합니다.  
        - 필요하다면 재회/극복의 타이밍 및 해법도 덧붙여주세요.

        ---

        ##[4장] 사전 질문 답변

        - 고객님의 사전 질문, 고민을 바탕으로 사주와 관상 명리적 근거에 기반해 심리적 해석과 공감 가득한 상담을 풍부하게 제공합니다.
        - 속마음, 운세 흐름, 고민의 본질적 원인, 과거·현재 상황의 연결, 앞으로 실천 가능한 현실적 조언까지 실제 상담처럼 세심하게, 그리고 사례·비유와 함께 길게 안내해 주세요.
        - 보고서가 잘 나오게, 유저가 사주 해석을 풍부하게 받아볼 수 있도록 충분히 상세하게 써 주세요.

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

        # 3. 이상형 이미지 생성 (Gemini 2.5 Flash 사용)
        user_gender = request.saju_data.get("input", {}).get("gender", "male")
        image_base64 = None
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

            print(f"[INFO] Gemini 2.5 Flash 이미지 프롬프트: {image_prompt}")

            # Gemini 2.5 Flash 이미지 생성 API 호출
            image_response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=f"Generate an image: {image_prompt}",
            )

            # 응답에서 이미지 추출
            if image_response.candidates and image_response.candidates[0].content.parts:
                for part in image_response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # 이미지 데이터가 있는 경우
                        image_bytes = part.inline_data.data
                        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                        image_prompt_used = image_prompt
                        partner_gender = "female" if user_gender == "male" else "male"
                        print(f"[INFO] 이미지 생성 성공 (크기: {len(image_bytes)} bytes)")
                        break

            if not image_base64:
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
            features["vibe"],
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
            # 자연스러운 포트레이트 스타일
            "candid lifestyle portrait photo",
            "handsome young Korean man",
            "natural confident pose",
            "upper body shot from chest up",
            # 배경 설정 (자연스럽고 세련된)
            "soft bokeh background",
            "warm golden hour lighting",
            "cafe or urban outdoor setting",
            # 한국인 특징 강조
            "100 percent Korean ethnicity",
            "authentic Korean male facial features",
            "age late 20s",
            # 사주별 얼굴 특징
            features["face"],
            features["eyes"],
            features["nose"],
            features["skin"],
            features["hair"],
            features["vibe"],
            # 매력적인 분위기
            "charming natural smile",
            "warm confident expression",
            "looking slightly off camera",
            # 스타일링
            "stylish smart casual fashion",
            "well-groomed clean appearance",
            "neat hairstyle",
            # 기술적 설정
            "professional DSLR photography",
            "shallow depth of field",
            "soft natural lighting",
            "cinematic color grading",
            "photorealistic ultra detailed",
            "8k high resolution"
        ]

    return ", ".join(prompt_parts)