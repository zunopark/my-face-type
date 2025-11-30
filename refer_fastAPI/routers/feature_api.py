# feature_api.py
from fastapi import APIRouter, File, UploadFile, Form
import os, httpx
from utils.resize import resize_image
import json

router = APIRouter()

# ────────────────────────────────────────────────
# Gemini API 설정
# ────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

# ────────────────────────────────────────────────
# 공통: 단일 이미지 분석 헬퍼
# ────────────────────────────────────────────────
async def _analyze_single(file: UploadFile) -> str:
    """
    단일 얼굴 특징을 텍스트로 반환.
    얼굴 전체 미인식 시 'again' 문자열 반환.
    """
    content = await file.read()
    b64_image = await resize_image(content)

    prompt = {
        "contents": [
            {
                "parts": [
                    {
                        "text": """
                                아래는 얼굴 특징 분석 요청입니다.

                                ### 1. 각 항목별로 사진에서 '겉으로 보이는 외형적 특징'만 한국어로 객관적으로 설명해 주세요.  
                                2. 절대 성격, 운세, 해석 등 주관적 해설은 하지 마세요. 오직 보이는 사실만 묘사해야 합니다.  
                                3. 반드시 항목별로 아래 예시 형식을 따라주세요.  
                                4. 아래 표의 분류/키워드 중 실제 해당하는 것은 빠짐없이 모두 기술하세요.  
                                5. 여러 특징이 동시에 보이면 모두 작성하세요.  
                                6. **얼굴 전체가 인식되지 않을 경우에만 'again'이라는 단어 하나만 출력하세요.**
                                - 일부 부위가 가려져도, 보이는 부위는 반드시 묘사하세요.
                                - 단, 얼굴이 전혀 인식되지 않거나 분석 불가 시에는 무조건 `again`만 출력.
                                7. **오관(눈·코·입·귀·눈썹), 삼정(상정·중정·하정), 12궁(각 부위의 모양·크기·위치·대칭 여부)을 반드시 포함해 설명하세요.**
                                8. 12궁 설명 시 각 부위의 형태, 크기, 위치, 대칭, 돌출·함몰 여부, 주름·점·흉터 유무, 길이/깊이 등 구체적으로 묘사하세요.

                                ---

                                ✅ 오관 (눈·코·입·귀·눈썹)  
                                👁️ 눈: 크기/형태(큰눈/작은눈/가느다란눈), 눈꼬리(올라감/처짐), 깊이(깊은눈/튀어나온눈), 쌍꺼풀 여부  
                                👃 코: 코날(우뚝/굽음), 높이(높음/낮음), 크기(크다/작다), 콧망울 형태, 콧대 두께  
                                👄 입: 크기(큰입/작은입), 입꼬리(올라감/처짐), 입술 두께(윗입술 두꺼움/아랫입술 두꺼움/얇음), 대칭 여부  
                                🪒 눈썹: 길이(긴/짧은), 두께(진한/엷은), 모양(일자/초승달/八자), 방향(치켜진/처진)  
                                👂 귀: 크기(크다/작다), 위치(위쪽/아래쪽), 귓볼(크다/작다/두껍다/얇다), 귀 각도(앞으로/뒤로 젖혀짐)

                                ---

                                ✅ 삼정  
                                - **상정(이마~눈썹)**: 이마 높이, 너비, 주름, 모양(둥근/네모진/M자형), 피부 표면  
                                - **중정(눈~코~광대)**: 광대 발달 정도, 코 크기와 높이, 코끝 모양, 비대칭 여부  
                                - **하정(코끝~턱)**: 입 모양, 턱 길이, 턱선 각도, 돌출/후퇴 여부

                                ---

                                ✅ 12궁 (사진에서 확인 가능한 외형 기준)  
                                1. **관록궁(이마)** → 넓이, 높이, 형태(둥근/네모/튀어나옴), 주름·흉터 여부  
                                2. **인당궁(미간)** → 너비, 평탄함/패임, 주름·점 유무  
                                3. **자녀궁(눈)** → 크기, 모양, 쌍꺼풀 유무, 대칭 여부  
                                4. **부부궁(광대)** → 크기, 높이, 폭, 돌출/함몰, 대칭 여부  
                                5. **재물궁(코)** → 길이, 폭, 콧대 모양, 콧망울 크기  
                                6. **수명궁(인중)** → 길이(짧음/김), 깊이(깊음/얕음), 대칭 여부, 주름·점 유무  
                                7. **노복궁(입)** → 크기, 폭, 입꼬리 방향, 대칭 여부  
                                8. **지궁(턱)** → 길이, 폭, 각도, 돌출/후퇴 여부, 좌우 균형  
                                9. **법령궁(법령)** → 주름 선명도, 길이, 대칭 여부  
                                10. **부모궁(귀)** → 크기, 위치, 형태, 귓볼 크기, 귓바퀴 두께  
                                11. **형제궁(뺨)** → 폭, 볼살 유무, 대칭 여부  
                                12. **관골궁(관골)** → 높이, 돌출/함몰, 폭, 대칭 여부

                                ---

                                **최종 출력 예시**  
                                
                                ""
                                눈은 크고 쌍꺼풀이 있으며 눈꼬리가 약간 올라가 있고 깊은 눈입니다.  
                                코는 코날이 곧고 높으며, 콧망울이 넓습니다.  
                                입은 작고 양쪽 입꼬리가 올라가 있으며, 윗입술이 두껍습니다.  
                                이마는 넓고 둥글며 중앙에 얕은 가로주름이 있습니다.  
                                눈썹은 길고 진하며 일자 모양입니다.  
                                귀는 크고 귓볼이 두껍고, 위치가 얼굴 중간보다 조금 높습니다.  
                                턱은 짧고 각지며 약간 앞으로 돌출되어 있습니다.  
                                광대는 넓고 약간 발달했습니다.

                                12궁 부위:  
                                - 관록궁(이마): 넓고 매끈함  
                                - 인당궁(미간): 넓고 평탄함  
                                - 자녀궁(눈): 대칭, 크고 또렷함  
                                - 부부궁(광대): 좌우 균형, 적당히 발달  
                                - 재물궁(코): 높고 곧음  
                                - 수명궁(인중): 길고 깊음  
                                - 노복궁(입): 폭 좁고 입꼬리 상승  
                                - 지궁(턱): 각지고 돌출  
                                - 법령궁(법령): 얕고 짧음  
                                - 부모궁(귀): 귓볼 큼, 위치 위쪽  
                                - 형제궁(뺨): 폭 좁음, 볼살 적음  
                                - 관골궁(관골): 돌출, 폭 넓음

                                성별: 남자
                                ""

                                **예외 예시 (얼굴 자체가 인식되지 않는 경우)**  
                                again
                        """
                    },
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64_image}},
                ]
            }
        ]
    }

    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(GEMINI_API_URL, headers=headers, json=prompt)
        res.raise_for_status()
        return res.json()["candidates"][0]["content"]["parts"][0]["text"]


# ────────────────────────────────────────────────
# 얼굴 특징 점수 계산 함수들
# ────────────────────────────────────────────────
def calculate_samjeong_balance(features_text: str) -> int:
    """삼정 밸런스 점수 계산 (0-10점)"""
    score = 5  # 기본 점수
    
    # 상정 분석
    if "이마" in features_text:
        if any(word in features_text for word in ["넓고", "넓은", "매끈", "둥근"]):
            score += 1
        if any(word in features_text for word in ["좁고", "좁은", "주름", "흉터"]):
            score -= 1
    
    # 중정 분석
    if "광대" in features_text:
        if any(word in features_text for word in ["발달", "넓고", "균형"]):
            score += 1
        if any(word in features_text for word in ["작고", "좁고", "비대칭"]):
            score -= 1
    
    # 하정 분석
    if "턱" in features_text:
        if any(word in features_text for word in ["각지고", "돌출", "균형"]):
            score += 1
        if any(word in features_text for word in ["짧고", "후퇴", "둥근"]):
            score -= 1
    
    # 코 분석 (중정의 핵심)
    if "코" in features_text:
        if any(word in features_text for word in ["곧고", "높고", "우뚝"]):
            score += 1
        if any(word in features_text for word in ["굽고", "낮고", "작고"]):
            score -= 1
    
    return max(1, min(10, score))


def calculate_ogwan_harmony(features_text: str) -> int:
    """오관 조화 점수 계산 (0-10점)"""
    score = 5  # 기본 점수
    harmony_count = 0
    
    # 눈 분석
    if "눈" in features_text:
        if any(word in features_text for word in ["크고", "또렷", "대칭", "쌍꺼풀"]):
            harmony_count += 1
        if any(word in features_text for word in ["작고", "비대칭", "처진"]):
            harmony_count -= 1
    
    # 코 분석
    if "코" in features_text:
        if any(word in features_text for word in ["곧고", "높고", "우뚝", "넓은"]):
            harmony_count += 1
        if any(word in features_text for word in ["굽고", "낮고", "작고"]):
            harmony_count -= 1
    
    # 입 분석
    if "입" in features_text:
        if any(word in features_text for word in ["올라가", "대칭", "적당"]):
            harmony_count += 1
        if any(word in features_text for word in ["처진", "비대칭", "작고"]):
            harmony_count -= 1
    
    # 귀 분석
    if "귀" in features_text:
        if any(word in features_text for word in ["크고", "두껍", "균형"]):
            harmony_count += 1
        if any(word in features_text for word in ["작고", "얇고", "비대칭"]):
            harmony_count -= 1
    
    # 눈썹 분석
    if "눈썹" in features_text:
        if any(word in features_text for word in ["진하고", "길고", "균형"]):
            harmony_count += 1
        if any(word in features_text for word in ["엷고", "짧고", "불균형"]):
            harmony_count -= 1
    
    # 조화도에 따른 점수 조정
    if harmony_count >= 3:
        score += 2
    elif harmony_count >= 1:
        score += 1
    elif harmony_count <= -2:
        score -= 2
    elif harmony_count <= -1:
        score -= 1
    
    return max(1, min(10, score))


def calculate_sibigung_average(features_text: str) -> int:
    """십이궁 평균 점수 계산 (0-10점)"""
    score = 5  # 기본 점수
    positive_count = 0
    negative_count = 0
    
    # 12궁 키워드 분석
    positive_keywords = [
        "넓고", "매끈", "둥근", "대칭", "발달", "균형", "또렷", "곧고", 
        "높고", "깊고", "상승", "돌출", "큰", "두껍", "위쪽"
    ]
    
    negative_keywords = [
        "좁고", "주름", "흉터", "비대칭", "작고", "얕고", "처진", 
        "후퇴", "짧고", "얇고", "아래쪽", "불균형"
    ]
    
    # 긍정적 키워드 카운트
    for keyword in positive_keywords:
        if keyword in features_text:
            positive_count += 1
    
    # 부정적 키워드 카운트
    for keyword in negative_keywords:
        if keyword in features_text:
            negative_count += 1
    
    # 점수 계산
    net_score = positive_count - negative_count
    
    if net_score >= 5:
        score += 3
    elif net_score >= 3:
        score += 2
    elif net_score >= 1:
        score += 1
    elif net_score <= -3:
        score -= 3
    elif net_score <= -1:
        score -= 1
    
    return max(1, min(10, score))


# ────────────────────────────────────────────────
# 1) 수정된 얼굴 특징 분석 엔드포인트
# ────────────────────────────────────────────────
@router.post("/analyze/features/")
async def analyze_features(file: UploadFile = File(...)):
    """얼굴 특징 분석 + 정량화 점수 반환 엔드포인트"""
    try:
        # 얼굴 특징 분석
        features = await _analyze_single(file)
        
        # 얼굴이 인식되지 않은 경우
        if features.strip() == "again":
            return {"error": "얼굴이 인식되지 않았습니다. 다시 시도해주세요."}
        
        # 정량화 점수 계산
        scores = {
            "samjeong_balance": calculate_samjeong_balance(features),
            "ogwan_harmony": calculate_ogwan_harmony(features),
            "sibigung_average": calculate_sibigung_average(features)
        }
        
        return {
            "features": features,
            "scores": scores
        }
        
    except Exception as e:
        return {"error": str(e)}


# ────────────────────────────────────────────────
# 2) 신규: 두 장(본인+상대) 얼굴 특징 분석
# ────────────────────────────────────────────────
@router.post("/analyze/pair/features/")
async def analyze_pair_features(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    """
    * 본인 사진(file1)과 상대 사진(file2)을 동시에 받아
      각자의 얼굴 특징 텍스트(features1, features2)를 반환합니다.
    * 훗날 두 feature 비교 → 궁합·재회 보고서 생성 로직을
      이곳에 추가 확장하면 됩니다.
    """
    try:
        features1 = await _analyze_single(file1)
        features2 = await _analyze_single(file2)
        return {"features1": features1, "features2": features2}
    except Exception as e:
        return {"error": str(e)}


# ────────────────────────────────────────────────
# 3) 신규: 커플 궁합 리포트 (한 줄 요약 + 상세 설명)
# ────────────────────────────────────────────────
from typing import Dict

# ────────────────────────────────────────────────
# 3) 커플 궁합 리포트 (여자 A, 남자 B 명시)  🔄 수정 버전
# ────────────────────────────────────────────────
def _build_compat_prompt(f1: str, f2: str) -> Dict:
    """
    features1(A), features2(B)를 받아 Gemini 프롬프트(JSON) 생성
    """
    prompt_txt = f"""
     # Mission
    두 사람의 얼굴 특징을 보고 **재치 있게 커플 궁합**을 평가해줘.
    두 사람의 얼굴을 통해 남자인지 여자인지 알 수 있어. 
    그래서 남자는 형님. 여자는 누님 이라고 정확히 말해줘. 

    ## Output format (MUST be valid JSON)
    {{
      "line_summary": "<커플 관계를 한 줄로 요약>",
      "detail": "<5~7줄로 재미있게 한문단으로 상세 설명>"
    }}

    ## Constraints
    0. 매우 중요 **"line_summary": "<커플 관계를 한 줄로 요약>", -> 한 줄 요약은 언니 오빠를 부르지 말고 딱 한 줄로 어떤 커플인지만 말해줘.**
    1. 외모 장·단점을 귀엽게 드립치되, 둘이 어떤 궁합인지 말해줘. 하지만 얼굴 특징을 자세하게 절대 말하지마. 신뢰도가 떨어져. 그냥 눈을 보아하니 이런 정도로 해줘. 반드시.
        1-1. 드립을 진짜 웃기게 쳐줘. 재밌고 신박하게
        1-2. 좋은 궁합 vs 안좋은 궁합 나눠서 톤앤 매너 잘 유지하면서 설명해줘.
        1-3. 좋은 궁합이면 조심해야할 점, 안좋은 궁합이면 개선해야할 점도 같이 설명해줘.
    2. 말투는 10~20대가 카톡에서 쓰는 흥미로운 톤.
        2-1. 감탄사 OK, 신조어·초성체 가능 ('개이득', '존맛' 등 저속하거나 비속어에 가까운 신조어는 절대 쓰지 마.)
        2-2. 하지만 이모지, 이모티콘은 절대 쓰지마. 
        2-3. 말투는 친근한 '-하오'체로 말해줘.
    3. 속궁합 얘기도 반드시 해주는데 과감한 단어를 사용하되, 여기도 장난 드립을 치면서 설명해줘. 근데 진짜 화끈하고 야하게 표현해줘. 
    4. 점수·등급 대신 에피소드식 코멘트.
    5. ‘~라고 합니다" 같은 객관화 표현 대신 친구에게 농담하듯 2~3인칭으로.
    6. **남자는 형님, 여는 누님     이라고 부르면 돼!**
    7. 좋은 커플이 되길 바래 이런 마지막 인사를 할 필요 없어. 

    다시 강조! 매우 중요 **"line_summary": "<커플 관계를 한 줄로 요약>", -> 한 줄 요약은 언니 오빠를 부르지 말고 딱 한 줄로 어떤 커플인지만 말해줘.**

    ## Input  (A, B) A와 B의 성별은 아래 특징에 있음. 
    [A의 특징]
    {f1}

    [B의 특징]
    {f2}

    **## 다시 한번 더 강조**
    ## 반드시 아래 json 형태로만 답해줘야해 반드시.

    {{
      "line_summary": "<커플 관계를 한 줄로 요약>",
      "detail": "<5~7줄로 재미있게 한문단으로 상세 설명>"
    }}

    """
    return {
        "contents": [
            {
                "parts": [
                    {"text": prompt_txt}
                ]
            }
        ]
    }

@router.post("/analyze/pair/compatibility/")
async def analyze_pair_compatibility(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    try:
        f1, f2 = await _analyze_single(file1), await _analyze_single(file2)
        if "again" in (f1.lower(), f2.lower()):
            return {"error": "얼굴이 잘 보이는 사진을 다시 올려 주세요."}

        prompt = _build_compat_prompt(f1, f2)
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(GEMINI_API_URL, headers=headers, json=prompt)
            res.raise_for_status()
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

        # 🌟 Gemini 응답이 JSON인지 검사
        if text.startswith("{") and text.endswith("}"):
            parsed = json.loads(text)
            return {
                "score": parsed.get("line_summary", "").strip(),
                "comment": parsed.get("detail", "").strip()
            }
        else:
            return {
                "error": "Gemini 응답이 JSON 형식이 아닙니다. GPT 프롬프트를 점검해 주세요.",
                "raw": text  # 👉 디버깅을 위해 원본도 같이 반환
            }

    except json.JSONDecodeError:
        return {"error": "Gemini 응답 파싱 실패. 프롬프트 결과를 JSON 형식으로 바꿔야 합니다."}
    except Exception as e:
        return {"error": str(e)}




# ────────────────────────────────────────────────
# 메인 엔드포인트
# ────────────────────────────────────────────────
@router.post("/analyze/profile")
async def analyze_profile(file: UploadFile = File(...)):
    """
    1장의 프로필 사진을 분석해 아래 JSON 1개로 응답:
    {
      "label": "...",
      "love_review": "...",
      "insights": {
         "strength": "...",
         "weakness": "...",
         "vibe": "..."
      },
      "relationship_lines": {
         "blind_date": "\"...\"",
         "ex": "\"...\""
      },
      "again": false
    }
    """
    try:
        # 1️⃣ 이미지 타입 확인
        if not (file.content_type and file.content_type.startswith("image/")):
            return {"error": "이미지 파일만 업로드해주세요."}

        # 2️⃣ 파일 읽기 + 리사이즈(Base64 JPEG)
        raw = await file.read()
        b64_image = await resize_image(raw)
        mime_type = "image/jpeg"

        # 3️⃣ 메인 프롬프트 작성
        prompt = """
⚠️ 중요: 반드시 순수 JSON 형식으로만 응답하세요.
다음을 절대 포함하지 마세요:
- 코드 블록 (```json, ``` 등)
- 마크다운 문법
- 설명 텍스트
- 줄바꿈이나 공백 (JSON 구조 외)

[목표]
한 장의 사진을 분석하여 아래 항목을 모두 작성합니다.

1) label — 관상가 양반식 한줄 별칭
    - 관상 별칭을 라벨형식으로 랜덤하게 붙여줘. 근데 그게 좀 현실에 있을법한 키워드여야 해. 2030 남여의 일상생활(활동, 직업, 학교생활, 대화 소재, 유행하는 밈에서 가져온 키워드들)들을 활용하여 재밌고 후킹되게 써줘.
    - **별칭은 사진의 분위기를 반영하되, 사진을 통해 매칭 가능하고 예상 가능한 워딩(예: 샤랄라 원피스 입은 사진 → 여신상, 청순 무드 등을 매칭)은 최대한 피하고, '현대적인 밈(Meme)'이나 '반전 요소'를 결합하여 후킹 요소를 극대화할 것.**
    - 2030 남여가 **최근 1년 사이**에 많이 사용하는 **현대적인 신조어** 및 **밈 기반 워딩**을 활용하되, **경박하거나 과하게 속된 표현(예: '쌉-', '오히려 좋아' 등)**은 금지한다. '재질'과 같이 고유명사화된 유행어는 사용 가능하다. 재미와 후킹 요소를 극대화할 것.
    - 핵심 지시: 별칭은 사진의 분위기를 반영하되, 경쟁사의 A, B 유형(활동/인기) 키워드에 C, D 유형(과장/반전 유머) 요소를 1개 이상 결합하여 예상치 못한 후킹과 웃음을 유도할 것. 특히 최근 1년 내 유행한 밈(Meme) 기반 워딩을 적극 활용해야 함.
        
    A. 활동/직업 기반
    
    특정 일상 활동이나 직업을 비유적으로 활용하여 연관성을 높임. (가장 흔한 패턴)도서관 책보다 빛나는 상, 카페 알바생 비주얼 끝판왕, 청담동 갤러리 알바상, 명찰 달고 출근할 상
    
    B. 소셜/인기 기반
    
    SNS 팔로워, 대인 관계, 인기를 과장하여 후킹을 유도함. (후킹 핵심 요소)환상의 유니콘 셀카왕, 번호 물어봄 주의, 러브레터 수북한 편, 팔로워 스타트업, 친구 인싸 그룹 리더상
    
    C. 상반/반전 유머
    
    외모와 전혀 다른 상황이나 맥락을 결합하여 재미를 유발함.떡볶이집 단골 손님상, 현실감각 잃은 연예인상, 갱년기 동창회 대표출석부상
    
    D. 극단적 비유
    
    '천사', '공주', '우두머리' 등 극단적인 대상을 끌어와 외모를 과장함.천사들이 눈이 멀 상, 공주님 스마트폰 하사받을 상, 온 동네 댕댕이 우두머리상
    
    - 아래 예시들은 경쟁사들의 라벨 데이터라서 결과값이 완전히 동일하면 안돼.
        - e.g. 라벨 예시
        환상의 유니콘 셀카왕
        번호 물어봄 주의
        러브레터 수북한편
        팔로워 스타트업
        도서관 책보다 빛나는 상
        카페 알바생 비주얼 끝판왕
        떡볶이집 단골 손님상
        청담동 갤러리 알바상
        현실감각 잃은 연예인상
        학교 축제때 인기 쓸어모을 상
        온라인 셀카 장인상
        명찰달고 출근할상
        대학교 홍보모델상
        피부모델상
        갱년기 동창회 대표출석부상
        술자리안빠지는상
        천사들이 눈이 멀 상
        친구 인싸 그룹 리더상
        선배님 한잔 하셔야죠 상
        산림욕 좋아하는 산책러
        공주님 스마트폰 하사받을 상
        아무한테 잘해주다 고백공격받을상
        고양이 사진 일 경우 -주인이랑 대화할 상
        강아지 사진일 경우-온동네 댕댕이 우두머리상
    - 출력은 가급적 한 줄 별칭 한 개만.
    - 출력은 띄어쓰기 포함 최대 15자 이내의 한 문장으로만 출력 (이모지/특수문자/해시태그 금지/ 줄바꿈 및 특수문자 구분 기호 사용 금지)
    - 외모 비하/차별/선정성/폭력성/민감 표현 금지.
    - 사적 정보/실명/직접경험 단정 묘사 금지.
    - *명사형 어미(…상/…무드/…느낌/…한 편)**로 간결하게.


2) love_review — 연애 관상평 (3~4문장, -하오체)
    - 관상가가의 관상평 3-4문장으로 출력
    - 얼굴의 특징과 분위기를 종합적으로 분석하여 연애관상 쪽으로 평가하기. 이마, 눈, 코 등 얼굴 각 부위에 대한 설명이 1-2번은 나와야 함. 그렇게 나온 이유 설명하기.
    - '사진 분위기' 분석을 관상평에 통합하여, 외모와 배경 무드가 연애에 미치는 영향을 하오체로 설명
    - 외모 부위 간단 분석+성격 설명+연애 관상 성향 설명
    - 이마, 눈, 코 등 얼굴 각 부위를 설명할 때, **객관적인 크기(작다, 크다)보다** 해당 부위가 풍기는 **인상(e.g., 결단력 있는 턱선, 선명한 입술색, 균형 잡힌 코)** 또는 **특징이 연애운/성향적으로 미치는 영향**에 초점을 맞춰 분석할 것.
    - 말투는 '-하오체'로 출력
예시 ("이마가 시원하게 드러나 활동력이 강하고 주도적인 연애를 즐기는 분이오. 밝게 웃는 입꼬리가 올라가 있어, 상대방에게 긍정적인 기운을 전달하는 에너지가 강하다오. 다만, 눈빛이 총명해 연애 초반에 상대방이 기준이 높다고 생각하고 접근을 어려워할 수 있소. 연애를 시작하면 자존감이 높아 의존하지 않는 매력적인 연애를 하시는 상이오.")


3) insights — 연애운, 연애 성향
    - strength: 💖 연애운 강점 (1문장, -해요체)
    - weakness: 🔒 연애운 약점 (1문장, -해요체)
    - vibe: ✨ 프사에서 느껴지는 분위기 (1문장, -해요체)
    - 💖 연애운 강점: /🔒 연애운 약점: /✨ 프사에서 느껴지는 분위기: / 를 제목으로 적고 관련 내용 출력. 제목만 볼드체로 출력.
    - 한 문장으로 출력, -해요체로 출력
    - 관상가양반의 연애 관상평의 내용과 연결지어서 내용을 구성함. 연애 성향 상 강점&약점 추론, 남들이 봤을 때 프로필사진에서 느껴지는 분위기를 설명함.
    예시
    (💖 연애운 강점: 스스로 빛을 내는 자존감이 높아 주변의 부러움을 사는 연애를 해요.
    🔒 연애운 약점: 관계 초반, 기준점이 높다고 느껴져 상대방이 도전적이라고 생각할 수 있어요.
    ✨ 프사에서 느껴지는 분위기: 활기찬 '갓생' 무드가 강해 스케일 큰 데이트를 좋아할 것 같은 분위기예요.)

4) relationship_lines — 관계별 심리 분석
    **1. 출력 및 형식 규정**
    - 관계별 심리 분석은 사진 분석 이후 해당 관계의 사람이 생각하고 할법한 말을 **랜덤하게** 출력
    - 한 줄 평은 그 관계 시점의 사람이 **진짜 말하는 것처럼 빙의**해서 말해주어야 합니다.
    - 출력은 **따옴표("")를 붙여서 말하듯이**, **1개 문장**으로만 출력해야 하며, 공백과 따옴표를 포함하여 **최대 30자**를 넘길 수 없습니다.
    - 어투는 현실적인 **2030 남성/여성의 대화체**(~하네)를 사용
    
    **2. 톤 가이드 및 랜덤 규칙**
    - 갓생과 같은 신조어 사용 금지, 물음표 느낌표 사용 금지

    - **소개팅 상대**의 톤은 설렘, 긍정적 호감, 기대감 **또는** 짓궂게 부정적인 톤 중 랜덤하게 번갈아 가며 출력
    - **부정적 멘트** 시에는 상대가 나랑 성향이 안 맞아 보이거나, 깐깐하게 보여 **포기/비꼬는 식의 유머+ 담백한 멘트**를 사용합니다.
    - 커뮤니티에서 자주 언급되는 소개팅남/녀 들의 소개팅 전 속마음을 담은 콘텐츠 글을 참고하여 다양한 케이스로 랜덤하게 출력
    - (예시: "와 너무 예쁜데. 손주 이름 뭐하지"/ 오늘 주선자 잃는 날인가(맘에 들지 않아서 주선자를 손절하겠다는 부정적인 의미))
    
    - **전애인**의 톤은 담백한 미련/후폭풍 **또는** 부정적이고 약간 짓궂은 톤 중 랜덤하게 번갈아 가며 출력합니다.
    - 커뮤니티에서 자주 언급되는 전남친/전여친 들의 속마음을 담은 콘텐츠 글을 참고하여 다양한 케이스로 랜덤하게 출력
    - **미련/후회 멘트** 시에는 '연락해 볼까?'와 같이 **순간적으로 흔들리는 솔직하고 현실적인 내면 멘트**를 사용하고, **부정적 멘트** 시에는 '헤어지길 잘했다'는 **자기 합리화**나 사소한 단점 지적 멘트를 사용합니다.
    - 예시: "예쁘긴 하네. 남친 생겼으려나, 연락해볼까” / 은근 사귈때랑 변함이 없네

    **3. 상호 보완 규칙**

    - **부정적인 내용 시**에는 물결 표시($\text{\textasciitilde}$), $\text{ㅋㅋ}$ 같은 의성어 출력을 **금지**합니다.
    - 또한, **한 쪽 관계가 부정적인 내용이 출력될 때는 다른 한 쪽은 무조건 긍정적인 내용**이 출력되어야 합니다. **둘 다 부정적인 내용 출력은 금지**되며, **둘 다 긍정적인 내용 출력은 가능**합니다.

    출력할 것: 
    - blind_date: 소개팅 상대 입장에서 한마디 (따옴표 포함)
    - ex: 전애인 입장에서 한마디 (따옴표 포함, 공백 포함 최대 70자)


얼굴이 전혀 인식되지 않으면 {"again": true} 만 출력합니다.

⚠️ 전체 레포트 예시 (이와 유사하게 작성):

{
  "label": "갓생 사는 캠퍼스 여신상",
  "love_review": "이마가 시원하게 드러나 활동력이 강하고 주도적인 연애를 즐기는 분이오. 밝게 웃는 입꼬리가 올라가 있어, 상대방에게 긍정적인 기운을 전달하는 에너지가 강하다오. 다만, 눈빛이 총명해 연애 초반에 상대방이 기준이 높다고 생각하고 접근을 어려워할 수 있소. 연애를 시작하면 자존감이 높아 의존하지 않는 매력적인 연애를 하시는 상이오.",
  "insights": {
    "strength": "스스로 빛을 내는 자존감이 높아 주변의 부러움을 사는 연애를 해요.",
    "weakness": "관계 초반, 기준점이 높다고 느껴져 상대방이 도전적이라고 생각할 수 있어요.",
    "vibe": "활기찬 '갓생' 무드가 강해 스케일 큰 데이트를 좋아할 것 같은 분위기예요."
  },
  "relationship_lines": {
    "blind_date": "\"와 너무 예쁜데. 손주 이름 뭐하지\"",
    "ex": "\"예쁘긴 하네. 남친 생겼으려나, 연락해볼까\""
  },
  "again": false
}

⚠️ 다시 한 번 강조: 위 JSON 형식 그대로, 코드 블록이나 추가 텍스트 없이 순수 JSON만 응답하세요.
""".strip()

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": b64_image}},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.9,
                "topP": 0.9,
                "maxOutputTokens": 1000,  # 더 긴 응답을 위해 800 → 1000으로 증가
            },
        }

        headers = {"Content-Type": "application/json"}

        # 4️⃣ Gemini 호출
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(GEMINI_API_URL, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        # 5️⃣ 모델 응답(JSON 파싱 강화)
        try:
            # Gemini 응답에서 텍스트 추출
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # 🔍 디버깅: Gemini가 실제로 무엇을 응답했는지 로깅
            print(f"[DEBUG] Gemini 응답 텍스트: {text[:200]}...")  # 처음 200자만
            print(f"[DEBUG] 텍스트 길이: {len(text)}")
            
            # 텍스트가 비어있는지 확인
            if not text:
                return {"error": "응답 파싱 실패", "detail": "Gemini 응답이 비어있습니다", "raw": data}
            
            # 코드 블록 제거 (```json ... ``` 형식일 경우)
            if text.startswith("```"):
                print("[DEBUG] 코드 블록 감지, 제거 중...")
                lines = text.split("\n")
                # 첫 줄(```json 또는 ```)과 마지막 줄(```) 제거
                if len(lines) > 2:
                    text = "\n".join(lines[1:-1])
                text = text.strip()
                print(f"[DEBUG] 코드 블록 제거 후: {text[:200]}...")
            
            # JSON 파싱
            obj = json.loads(text)
            print("[DEBUG] JSON 파싱 성공!")
            
        except KeyError as e:
            # candidates나 content가 없는 경우
            print(f"[ERROR] KeyError: {e}")
            return {"error": "응답 구조 오류", "detail": f"KeyError: {str(e)}", "raw": data}
            
        except json.JSONDecodeError as e:
            # JSON 파싱 실패
            print(f"[ERROR] JSON 파싱 실패: {e}")
            return {
                "error": "JSON 파싱 실패", 
                "detail": str(e), 
                "raw_text": text if 'text' in locals() else "N/A",
                "raw": data
            }
            
        except Exception as e:
            # 기타 오류
            print(f"[ERROR] 예상치 못한 오류: {e}")
            return {
                "error": "응답 파싱 실패", 
                "detail": str(e), 
                "raw_text": text if 'text' in locals() else "N/A",
                "raw": data
            }

        # 6️⃣ 미인식 처리
        if obj.get("again") is True:
            return {"result": {"again": True}}

        # 7️⃣ 라벨 길이 제한
        if "label" in obj and len(obj["label"]) > 15:
            obj["label"] = obj["label"][:15]

        return {"result": obj}

    except httpx.HTTPStatusError as he:
        print(f"[ERROR] HTTP 오류: {he.response.status_code}")
        return {"error": f"HTTP {he.response.status_code}", "detail": he.response.text}
        
    except Exception as e:
        print(f"[ERROR] 예상치 못한 오류: {e}")
        return {"error": str(e)}