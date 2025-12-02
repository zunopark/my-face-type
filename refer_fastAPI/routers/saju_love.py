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
    AI 응답을 챕터별로 분리 (3장 구조)
    """
    chapters = []

    # 챕터 구분자로 분리
    chapter_markers = [
        "[1장]",
        "[2장]",
        "[3장]"
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
        - **사전 질문 활용:** 고객이 입력한 연애 고민, 선호 이성 타입, 현재 상황 등의 내용을 **1장의 서두**에 인용하여 고객의 상황을 짚어주며 보고서의 개인 맞춤도를 높입니다.
        - **캐릭터 상호작용 (다독임):** AI가 고객의 마음을 읽고 공감하며 명쾌한 해답을 제시하는 듯한 친근한 전문가의 느낌을 연출합니다.

        ### [보고서 작성 기본 규칙 및 문체]
        0. 내담자를 부를 때는 성을 뺴고 불러줘. 예를 들면, 윤용섭은 "용섭님" 이라고 부르면 되고 선우성진 등 4글자인데 2글자 성을 갖고 있는 사람은 "성진님" 이라고 부르면 돼
        1. **분량:** 각 풀이 항목은 정보의 깊이를 위해 충분한 분량(각 장 당 최소 3,000자 이상/전체 보고서는 총 10,000자 이상)으로 상세하게 작성합니다.
        2. **전문 용어 활용:** 사주/관상 상의 핵심 개념(일간, 일지, 특정 오행, 십성)을 반드시 언급하고, 그 개념을 **일상적이고 간결한 언어와 비유**를 섞어 풀어서 설명합니다. 반드시 한자는 한글로 뜻과 음을 설명해줘야 합니다. (토스처럼 명료하게 핵심만 전달)
        3. **외적/분위기 풀이 (비유법):** 외모, 첫인상, 매력 요소 등 **외부로 드러나는 부분**을 설명할 때는 **일상 속 구체적인 상황이나 사물에 빗댄 비유법**을 활용하여 감각적으로 표현합니다.
        4. **성향/행동 풀이 (결과론적 풀이):** 연애 스타일, 강점, 약점 등 **내적인 성향이나 행동 패턴**을 설명할 때는 '사주 기운 때문에 결국 그런 결과로 이어질 수밖에 없다'는 **결과론적 풀이**를 강조하여 설득력을 높입니다.
        5. **공감 표현:** 솔로 생활 중 또는 연애 시 고객이 자주 느낄 만한 고민이나 속마음을 이중 따옴표("...")를 사용하여 그대로 대변해 줍니다.
        6. **어조:** **친근하고 신뢰감을 주는 전문가의 톤**을 유지하며, 문장은 명료하고 간결하게 구성합니다.
        7. **사용 금지 표현 및 기호**: 고객에게 보여줄 최종 레포트이기에, '[속마음 공감]', '내용'과 같은 프롬프트 상의 지침들은 다 제외해야합니다. * 등의 특수기호는 절대 쓰지 않습니다. 그리고 "분석하여 제시합니다"와 같은 표현 너무 딱딱하고 AI 스러운 표현은 제외한다. 본문 흐름을 방해할 수 있는 '결과론적 풀이'와 같은 내부 소제목은 삭제하고, 전체 내용을 깔끔하게 이어서 보여줘야 한다.

        ---
        ##[1장] 나만의 매력과 연애 성향

        ###풀이 1. 일간으로 보는 연애 DNA
        - 일간(본질)이 연애에서 어떻게 드러나는지, {name}님의 타고난 연애 기질을 분석해요.
        - 일간의 오행과 음양이 사랑에 빠지는 방식, 감정 표현 스타일, 연애 시 무의식적으로 나오는 행동 패턴을 상세히 풀이합니다.
        - 예시: "갑목 일간이라 처음엔 무심한 듯 다가가지만, 한번 마음 주면 뿌리 깊은 나무처럼 흔들림 없는 사랑을 해요."

        ###풀이 2. 첫인상과 외적 매력
        - 이성이 처음 {name}님을 봤을 때 느끼는 분위기와 매력을 묘사해요.
        - 일간과 월지, 일지의 조합으로 "여우상", "강아지상", "차가운 도시 느낌" 등 구체적인 비유를 활용해 설명합니다.
        - 연애 시장에서 {name}님만의 차별화된 매력 포인트가 무엇인지 알려드려요.

        ###풀이 3. 연애 스타일 장단점
        - 십성과 오행 배치로 분석한 {name}님의 연애 장점과 보완점을 설명해요.
        - 연애할 때 상대가 감동받는 행동, 반대로 조심해야 할 습관까지 솔직하게 짚어드립니다.
        - "이런 점 때문에 상대방이 빠지고, 이런 점 때문에 오해받을 수 있어요"를 구체적인 상황 예시와 함께 전달해요.

        ###풀이 4. 나에게 맞는 인연 찾는 법
        - 인만추(인스타 만남 추천) vs 자만추(자연스러운 만남 추천) vs 소개팅/결정사 중 사주상 가장 성공 확률 높은 방법을 알려드려요.
        - 도화살 유무, 관성/재성 배치, 일간의 성향을 근거로 왜 그 방법이 {name}님에게 맞는지 명리학적으로 설명합니다.
        - 각 만남 방식별 구체적인 실전 팁과 피해야 할 상황도 함께 안내해요.

        ---

        ##[2장] 앞으로 펼쳐질 사랑의 흐름

        ###풀이 1. 연애운 폭발 시기 분석
        ####2025년 연애운
        - 올해 남은 기간 동안의 연애운 흐름을 월별로 상세 분석해요.
        - 이성 기운이 특히 강해지는 달, 인연이 들어오는 타이밍, 조심해야 할 시기를 짚어드립니다.

        ####2026년 연애운
        - 내년 전체 연애운의 큰 흐름과 분기별 주요 포인트를 설명해요.
        - 특히 인연이 집중되는 시기(예: 2026년 3~5월, 8~9월 등)와 그때 만날 인연의 특징을 미리 알려드립니다.

        ####2027년 연애운
        - 2027년 연애운의 특징과 주목해야 할 시기를 안내해요.
        - 결혼운과의 연결, 장기적인 관계 발전 가능성 등 중요한 변화를 짚어드립니다.

        ###풀이 2. 이번 달 연애 운세
        - 지금 이번 달! 연애운이 어떻게 흐르고 있는지 주 단위로 상세 분석해요.
        - 이성이 들어오는 기운의 강약, 연애 기회를 높일 수 있는 구체적인 행동과 장소(예: 금요일 저녁 모임, 주말 취미활동 등)를 제안합니다.
        - "이번 주 토요일에 지인 모임 가면 좋은 인연 만날 가능성 높아요" 같은 실질적인 조언을 드려요.

        ###풀이 3. 고민 상담 및 조언
        - 고객님이 남긴 연애 고민에 대해 사주적 관점에서 심층 상담을 해드려요.
        - 고민의 근본 원인을 사주로 분석하고, 실제로 어떻게 행동하면 좋을지 현실적인 해결책을 제시합니다.
        - 속마음을 읽고 공감하며, 따뜻하지만 명쾌한 조언을 전달해요.

        ---

        ##[3장] 결국 만나게 될 운명의 상대

        ###풀이 1. 이상형 분석
        ####외모와 분위기
        - 사주(일지/관성/재성/도화살)를 기반으로 {name}님에게 끌릴 이상형의 외모를 구체적으로 묘사해요.
        - 키, 체형, 얼굴 분위기, 스타일 등 마치 이상형 그림을 그리듯 상세하게 설명합니다.

        ####성격과 MBTI
        - 운명의 상대가 가질 성격적 특징, 예상 MBTI, 평소 행동 패턴을 분석해요.
        - "조용하지만 깊은 생각을 가진 INFJ 스타일" 같이 구체적인 예시로 설명합니다.

        ####직업군과 라이프스타일
        - 배우자궁과 십성 분석으로 인연이 될 상대의 예상 직업군, 경제력, 생활 방식을 풀이해요.
        - 어떤 분야에서 일하는 사람과 인연이 깊은지, 왜 그런지 명리학적 근거와 함께 설명합니다.

        ###풀이 2. 언제 어디서 만나나
        ####인연 등장 시점
        - 대운과 세운 흐름에서 운명적 인연이 등장하는 시기를 구체적으로 짚어드려요.
        - "2026년 봄~여름 사이", "2027년 하반기" 등 실제 시기와 그때의 운세 흐름을 설명합니다.

        ####만남의 장소와 상황
        - 사주상 인연을 만나기 좋은 장소와 상황을 구체적으로 안내해요.
        - 클라이밍장, 독서모임, 직장, 소개팅 등 왜 그 장소가 {name}님에게 길한지 명리학적으로 해석합니다.

        ###풀이 3. 그 사람 마음 사로잡는 법
        ####첫인상 전략
        - 운명의 상대 앞에서 좋은 첫인상을 남길 수 있는 옷차림, 스타일링, 분위기 연출법을 알려드려요.
        - {name}님의 사주 장점을 극대화하는 방법을 제안합니다.

        ####플러팅과 대화법
        - 상대의 마음을 사로잡을 수 있는 대화 스타일, 플러팅 멘트, 행동 팁을 구체적으로 전달해요.
        - {name}님 사주의 약점(예: 표현력, 신중함)을 연애에서 어떻게 보완하면 좋을지도 함께 조언합니다.

        ####관계 발전과 위기 극복
        - 썸에서 연애로, 연애에서 결혼으로 발전시키는 전략을 알려드려요.
        - 혹시 위기가 왔을 때(썸붕, 권태, 이별 위기) 어떻게 극복하고 재회할 수 있는지 실질적인 대처법도 안내합니다.

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