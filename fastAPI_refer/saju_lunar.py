# services/saju_lunar.py
"""
lunar-python 기반 사주 계산 모듈
- 사주 팔자, 십성, 지장간, 12운성, 12신살
- 오행 분포, 신강/신약 (자체 계산)
- 신살 20종 (자체 계산)
- 대운, 세운, 소운 (lunar-python)
- 납음, 절기 등
- 천신 12신, 길신, 흉살, 귀인 방위 (lunar-python)
- 구성(九星), 28수, 건제12신 (lunar-python)
- 태원, 명궁, 신궁 (lunar-python)
"""

from typing import Dict, Any, Optional, List
from lunar_python import Solar, Lunar

# ============================================
# 기본 테이블
# ============================================

STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
STEM_KOR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
STEM_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"]
STEM_YIN = ["yang", "yin", "yang", "yin", "yang", "yin", "yang", "yin", "yang", "yin"]

BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
BRANCH_KOR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"]
BRANCH_YIN = ["yang", "yin", "yang", "yin", "yang", "yin", "yang", "yin", "yang", "yin", "yang", "yin"]
ZODIAC = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"]
ZODIAC_KOR = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"]

# 지지 지장간 본기
BRANCH_MAIN_HS = {
    "子": "癸", "丑": "己", "寅": "甲", "卯": "乙", "辰": "戊", "巳": "丙",
    "午": "丁", "未": "己", "申": "庚", "酉": "辛", "戌": "戊", "亥": "壬"
}

# 오행 색상
ELEM_COLOR = {
    "wood": "#2aa86c", "fire": "#ff6a6a", "earth": "#caa46a",
    "metal": "#b8bec6", "water": "#6aa7ff"
}
ELEM_HANJA = {"wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水"}
ELEM_KOR = {"wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수"}

YANG_STEMS = {"甲", "丙", "戊", "庚", "壬"}

# 지장간 (여기, 중기, 정기)
JIJANGGAN = {
    "子": [("壬", 10), ("癸", 20)],
    "丑": [("癸", 9), ("辛", 3), ("己", 18)],
    "寅": [("戊", 7), ("丙", 7), ("甲", 16)],
    "卯": [("甲", 10), ("乙", 20)],
    "辰": [("乙", 9), ("癸", 3), ("戊", 18)],
    "巳": [("戊", 7), ("庚", 7), ("丙", 16)],
    "午": [("丙", 10), ("己", 9), ("丁", 11)],
    "未": [("丁", 9), ("乙", 3), ("己", 18)],
    "申": [("戊", 7), ("壬", 7), ("庚", 16)],
    "酉": [("庚", 10), ("辛", 20)],
    "戌": [("辛", 9), ("丁", 3), ("戊", 18)],
    "亥": [("戊", 7), ("甲", 7), ("壬", 16)],
}

# 12운성표
TWELVE_STAGES = {
    "甲": {"亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양"},
    "乙": {"午": "장생", "巳": "목욕", "辰": "관대", "卯": "건록", "寅": "제왕", "丑": "쇠", "子": "병", "亥": "사", "戌": "묘", "酉": "절", "申": "태", "未": "양"},
    "丙": {"寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양"},
    "丁": {"酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양"},
    "戊": {"寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양"},
    "己": {"酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양"},
    "庚": {"巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양"},
    "辛": {"子": "장생", "亥": "목욕", "戌": "관대", "酉": "건록", "申": "제왕", "未": "쇠", "午": "병", "巳": "사", "辰": "묘", "卯": "절", "寅": "태", "丑": "양"},
    "壬": {"申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양"},
    "癸": {"卯": "장생", "寅": "목욕", "丑": "관대", "子": "건록", "亥": "제왕", "戌": "쇠", "酉": "병", "申": "사", "未": "묘", "午": "절", "巳": "태", "辰": "양"},
}

# 신강/신약 계산용 (기존 - 단순화 버전)
POSITION_WEIGHT = {
    "year_stem": 10, "month_stem": 10, "hour_stem": 10,
    "year_branch": 10, "month_branch": 30, "day_branch": 15, "hour_branch": 15,
}
HELPING_STARS = {"비견", "겁재", "정인", "편인"}

# ============================================
# 560점 체계 신강/신약 계산용 테이블
# ============================================

# 천간 점수 (각 40분)
STEM_SCORE = 40

# 지지 점수 (총 100분 = 본기 60 + 중기 30 + 여기 10)
BRANCH_SCORE_TOTAL = 100
JIJANGGAN_RATIO = {
    "main": 60,    # 본기 (정기) 60%
    "mid": 30,     # 중기 30%
    "extra": 10,   # 여기 10%
}

# 지장간 상세 (위치별: 여기, 중기, 본기 순)
# 실제 비율은 3개 지장간 존재 시 1:3:6, 2개 시 1:6 또는 3:7
JIJANGGAN_DETAIL = {
    "子": [("壬", 10), ("癸", 90)],                     # 여기 10, 본기 90 (중기 없음)
    "丑": [("癸", 10), ("辛", 30), ("己", 60)],         # 여기:중기:본기 = 1:3:6
    "寅": [("戊", 10), ("丙", 30), ("甲", 60)],
    "卯": [("甲", 10), ("乙", 90)],                     # 여기 10, 본기 90
    "辰": [("乙", 10), ("癸", 30), ("戊", 60)],
    "巳": [("戊", 10), ("庚", 30), ("丙", 60)],
    "午": [("丙", 10), ("己", 30), ("丁", 60)],
    "未": [("丁", 10), ("乙", 30), ("己", 60)],
    "申": [("戊", 10), ("壬", 30), ("庚", 60)],
    "酉": [("庚", 10), ("辛", 90)],                     # 여기 10, 본기 90
    "戌": [("辛", 10), ("丁", 30), ("戊", 60)],
    "亥": [("戊", 10), ("甲", 30), ("壬", 60)],
}

# 왕상휴수사 (旺相休囚死) - 계절에 따른 오행 강약 비율
# 월지로 계절 판단: 寅卯辰=봄(木), 巳午未=여름(火), 申酉戌=가을(金), 亥子丑=겨울(水)
WANGXIANG_XIUSISI = {
    # 봄 (木이 왕)
    "wood_season": {
        "wood": 1.0,    # 旺 - 당월 오행
        "fire": 0.8,    # 相 - 내가 생하는 오행
        "water": 0.6,   # 休 - 나를 생하는 오행
        "metal": 0.4,   # 囚 - 나를 극하는 오행
        "earth": 0.2,   # 死 - 내가 극하는 오행
    },
    # 여름 (火가 왕)
    "fire_season": {
        "fire": 1.0,
        "earth": 0.8,
        "wood": 0.6,
        "water": 0.4,
        "metal": 0.2,
    },
    # 가을 (金이 왕)
    "metal_season": {
        "metal": 1.0,
        "water": 0.8,
        "earth": 0.6,
        "fire": 0.4,
        "wood": 0.2,
    },
    # 겨울 (水가 왕)
    "water_season": {
        "water": 1.0,
        "wood": 0.8,
        "metal": 0.6,
        "earth": 0.4,
        "fire": 0.2,
    },
    # 환절기/토왕용사 (土가 왕) - 辰戌丑未
    "earth_season": {
        "earth": 1.0,
        "metal": 0.8,
        "fire": 0.6,
        "wood": 0.4,
        "water": 0.2,
    },
}

# 월지에서 계절 판단
BRANCH_TO_SEASON = {
    "寅": "wood_season", "卯": "wood_season", "辰": "earth_season",
    "巳": "fire_season", "午": "fire_season", "未": "earth_season",
    "申": "metal_season", "酉": "metal_season", "戌": "earth_season",
    "亥": "water_season", "子": "water_season", "丑": "earth_season",
}

# 통근력 거리 계수 (일간 기준 거리에 따른 힘의 전달율)
# 일지: 거리 0 → 100%, 월지/시지: 거리 1 → 90%, 연지: 거리 2.5 → 75%
TONGGEUN_DISTANCE = {
    "year": 0.75,    # 연지 - 가장 멀리
    "month": 0.90,   # 월지
    "day": 1.00,     # 일지 - 가장 가까움
    "hour": 0.90,    # 시지
}

# 비겁/인성 오행 (일간 오행 기준)
def get_helping_elements(day_stem_element: str) -> dict:
    """일간 오행 기준으로 비겁(같은 오행)과 인성(나를 생하는 오행) 반환"""
    elem_cycle = ["wood", "fire", "earth", "metal", "water"]
    day_idx = elem_cycle.index(day_stem_element)

    bijob_elem = day_stem_element                      # 비겁 = 같은 오행
    insung_elem = elem_cycle[(day_idx - 1) % 5]        # 인성 = 나를 생하는 오행

    return {
        "bijob": bijob_elem,      # 비견/겁재
        "insung": insung_elem,    # 정인/편인
    }

# 신강/신약 판정 임계값 (560점 체계)
STRENGTH_THRESHOLDS = {
    "극신약": (0, 40),       # 일간 점수(40분)도 못 채움
    "태약": (40, 80),        # 40~80분
    "신약": (80, 140),       # 80~140분
    "중화": (140, 200),      # 140~200분
    "신강": (200, 320),      # 200~320분
    "태강": (320, 450),      # 320~450분
    "극신강": (450, 560),    # 450분 이상
}

# ============================================
# 신살 테이블
# ============================================

CHEONUL_GUIIN = {
    "甲": ["丑", "未"], "乙": ["子", "申"], "丙": ["酉", "亥"],
    "丁": ["酉", "亥"], "戊": ["丑", "未"], "己": ["子", "申"],
    "庚": ["丑", "未"], "辛": ["寅", "午"], "壬": ["卯", "巳"], "癸": ["卯", "巳"]
}

CHEONDUK_GUIIN = {
    "寅": "丁", "卯": "申", "辰": "壬", "巳": "辛", "午": "亥", "未": "甲",
    "申": "癸", "酉": "寅", "戌": "丙", "亥": "乙", "子": "巳", "丑": "庚"
}

WOLDUK_GUIIN = {
    "寅": "丙", "午": "丙", "戌": "丙", "申": "壬", "子": "壬", "辰": "壬",
    "亥": "甲", "卯": "甲", "未": "甲", "巳": "庚", "酉": "庚", "丑": "庚"
}

TAEGEUK_GUIIN = {
    "甲": ["子", "午"], "乙": ["子", "午"], "丙": ["卯", "酉"], "丁": ["卯", "酉"],
    "戊": ["辰", "戌", "丑", "未"], "己": ["辰", "戌", "丑", "未"],
    "庚": ["寅", "亥"], "辛": ["寅", "亥"], "壬": ["巳", "申"], "癸": ["巳", "申"]
}

MUNCHANG_GUIIN = {
    "甲": "巳", "乙": "午", "丙": "申", "丁": "酉", "戊": "申",
    "己": "酉", "庚": "亥", "辛": "子", "壬": "寅", "癸": "卯"
}

DOHWA = {
    "寅": "卯", "午": "卯", "戌": "卯", "申": "酉", "子": "酉", "辰": "酉",
    "巳": "午", "酉": "午", "丑": "午", "亥": "子", "卯": "子", "未": "子"
}

YEOKMA = {
    "寅": "申", "午": "申", "戌": "申", "申": "寅", "子": "寅", "辰": "寅",
    "巳": "亥", "酉": "亥", "丑": "亥", "亥": "巳", "卯": "巳", "未": "巳"
}

HWAGAE = {
    "寅": "戌", "午": "戌", "戌": "戌", "申": "辰", "子": "辰", "辰": "辰",
    "巳": "丑", "酉": "丑", "丑": "丑", "亥": "未", "卯": "未", "未": "未"
}

YANGIN = {"甲": "卯", "丙": "午", "戊": "午", "庚": "酉", "壬": "子"}

HONGYEOM = {
    "甲": ["午", "申"], "乙": ["午"], "丙": ["寅"], "丁": ["未"], "戊": ["辰"],
    "己": ["辰"], "庚": ["戌", "申"], "辛": ["酉"], "壬": ["子", "申"], "癸": ["申"]
}

GOEGANG_ILJU = {"庚辰", "庚戌", "壬辰", "戊戌"}
BAEKHO_ILJU = {"甲辰", "乙未", "丙戌", "丁丑", "戊辰", "壬戌", "癸丑"}
GORAN_ILJU = {"甲寅", "乙巳", "丁巳", "戊申", "辛亥"}

WONJIN_PAIRS = [("子", "未"), ("丑", "午"), ("寅", "酉"), ("卯", "申"), ("辰", "亥"), ("巳", "戌")]
GWIMUN_PAIRS = [("子", "酉"), ("丑", "午"), ("寅", "未"), ("卯", "申"), ("辰", "亥"), ("巳", "戌")]

GWASUK = {
    "寅": "丑", "卯": "丑", "辰": "丑", "巳": "辰", "午": "辰", "未": "辰",
    "申": "未", "酉": "未", "戌": "未", "亥": "戌", "子": "戌", "丑": "戌"
}

GOSIN = {
    "寅": "巳", "卯": "巳", "辰": "巳", "巳": "申", "午": "申", "未": "申",
    "申": "亥", "酉": "亥", "戌": "亥", "亥": "寅", "子": "寅", "丑": "寅"
}

HYUNCHIM_CHARS = {"甲", "辛", "申", "卯", "午"}

SIXTY_GAPJA = [
    "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
    "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
    "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
    "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
    "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
    "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥"
]

GONGMANG_MAP = {
    0: ["戌", "亥"], 1: ["申", "酉"], 2: ["午", "未"],
    3: ["辰", "巳"], 4: ["寅", "卯"], 5: ["子", "丑"],
}

# 12신살 (삼합 기준)
TWELVE_SINSAL_TABLE = {
    '巳酉丑': {'寅': '겁살', '卯': '재살', '辰': '천살', '巳': '지살', '午': '도화살', '未': '월살',
               '申': '망신살', '酉': '장성살', '戌': '반안살', '亥': '역마살', '子': '육해살', '丑': '화개살'},
    '申子辰': {'巳': '겁살', '午': '재살', '未': '천살', '申': '지살', '酉': '도화살', '戌': '월살',
               '亥': '망신살', '子': '장성살', '丑': '반안살', '寅': '역마살', '卯': '육해살', '辰': '화개살'},
    '亥卯未': {'申': '겁살', '酉': '재살', '戌': '천살', '亥': '지살', '子': '도화살', '丑': '월살',
               '寅': '망신살', '卯': '장성살', '辰': '반안살', '巳': '역마살', '午': '육해살', '未': '화개살'},
    '寅午戌': {'亥': '겁살', '子': '재살', '丑': '천살', '寅': '지살', '卯': '도화살', '辰': '월살',
               '巳': '망신살', '午': '장성살', '未': '반안살', '申': '역마살', '酉': '육해살', '戌': '화개살'},
}


# ============================================
# 유틸리티 함수
# ============================================

def get_stem_info(stem: str) -> Dict[str, Any]:
    """천간 정보"""
    i = STEMS.index(stem)
    elem = STEM_ELEM[i]
    return {
        "char": stem,
        "korean": STEM_KOR[i],
        "element": elem,
        "elementKor": ELEM_KOR[elem],
        "elementHanja": ELEM_HANJA[elem],
        "yinYang": STEM_YIN[i],
        "yinYangKor": "양" if STEM_YIN[i] == "yang" else "음",
        "color": ELEM_COLOR[elem],
    }


def get_branch_info(branch: str) -> Dict[str, Any]:
    """지지 정보"""
    i = BRANCHES.index(branch)
    elem = BRANCH_ELEM[i]
    return {
        "char": branch,
        "korean": BRANCH_KOR[i],
        "element": elem,
        "elementKor": ELEM_KOR[elem],
        "elementHanja": ELEM_HANJA[elem],
        "yinYang": BRANCH_YIN[i],
        "yinYangKor": "양" if BRANCH_YIN[i] == "yang" else "음",
        "zodiac": ZODIAC[i],
        "zodiacKor": ZODIAC_KOR[i],
        "mainHiddenStem": BRANCH_MAIN_HS[branch],
        "color": ELEM_COLOR[elem],
    }


def get_ten_god(day_stem: str, target_stem: str) -> str:
    """십성 계산"""
    elem_idx = {"wood": 0, "fire": 1, "earth": 2, "metal": 3, "water": 4}
    me_e = STEM_ELEM[STEMS.index(day_stem)]
    me_y = STEM_YIN[STEMS.index(day_stem)]
    tg_e = STEM_ELEM[STEMS.index(target_stem)]
    tg_y = STEM_YIN[STEMS.index(target_stem)]

    is_same_yinyang = (me_y == tg_y)
    me = elem_idx[me_e]
    tg = elem_idx[tg_e]

    if (me + 1) % 5 == tg:
        return "식신" if is_same_yinyang else "상관"
    if (me + 2) % 5 == tg:
        return "편재" if is_same_yinyang else "정재"
    if (tg + 2) % 5 == me:
        return "편관" if is_same_yinyang else "정관"
    if (tg + 1) % 5 == me:
        return "편인" if is_same_yinyang else "정인"
    if me_e == tg_e:
        return "비견" if is_same_yinyang else "겁재"
    return "미정"


def get_jijanggan(branch: str) -> Dict[str, Any]:
    """지장간 정보"""
    jj_list = JIJANGGAN.get(branch, [])
    chars = [item[0] for item in jj_list]
    korean = [STEM_KOR[STEMS.index(item[0])] for item in jj_list]
    return {
        "chars": chars,
        "display": "".join(chars),
        "displayKorean": "".join(korean),
        "detail": [{"stem": item[0], "korean": STEM_KOR[STEMS.index(item[0])], "days": item[1]} for item in jj_list]
    }


def get_twelve_stage(day_stem: str, branch: str) -> str:
    """12운성"""
    return TWELVE_STAGES.get(day_stem, {}).get(branch, "")


def get_samhap_group(branch: str) -> str:
    """삼합 그룹"""
    if branch in ['巳', '酉', '丑']:
        return '巳酉丑'
    elif branch in ['申', '子', '辰']:
        return '申子辰'
    elif branch in ['亥', '卯', '未']:
        return '亥卯未'
    return '寅午戌'


def get_twelve_sinsal(base_branch: str, target_branch: str) -> str:
    """12신살"""
    group = get_samhap_group(base_branch)
    return TWELVE_SINSAL_TABLE[group].get(target_branch, '')


def get_gongmang(ilju: str) -> List[str]:
    """공망"""
    if ilju in SIXTY_GAPJA:
        idx = SIXTY_GAPJA.index(ilju)
        return GONGMANG_MAP[idx // 10]
    return []


def get_chunui(wolji: str) -> str:
    """천의성"""
    idx = BRANCHES.index(wolji)
    return BRANCHES[(idx - 1) % 12]


# ============================================
# 신강/신약 계산 (560점 체계)
# ============================================

def calculate_strength_560(day_stem: str, pillars_raw: Dict) -> Dict[str, Any]:
    """
    560점 체계 기반 신강/신약 계산

    계산 방식:
    1. 일간 기본 점수: 40분
    2. 천간 점수: 각 40분 × 왕상휴수사 비율 × 비겁/인성 여부
    3. 지지 점수: 지장간별 점수 합계 × 통근력 거리 계수 × 왕상휴수사 비율
    4. 총점 = 일간(40) + 도움되는 천간 점수 + 도움되는 지지 점수
    """
    # 기본 정보 추출
    year_stem = pillars_raw["year"]["stem"]
    month_stem = pillars_raw["month"]["stem"]
    day_branch = pillars_raw["day"]["branch"]
    hour_stem = pillars_raw.get("hour", {}).get("stem")
    year_branch = pillars_raw["year"]["branch"]
    month_branch = pillars_raw["month"]["branch"]
    hour_branch = pillars_raw.get("hour", {}).get("branch")

    # 일간 오행
    day_stem_idx = STEMS.index(day_stem)
    day_stem_element = STEM_ELEM[day_stem_idx]

    # 비겁/인성 오행 (도움되는 오행)
    helping_elems = get_helping_elements(day_stem_element)
    bijob_elem = helping_elems["bijob"]    # 비견/겁재
    insung_elem = helping_elems["insung"]  # 정인/편인

    # 계절 (월지 기준)
    season = BRANCH_TO_SEASON.get(month_branch, "earth_season")
    season_ratios = WANGXIANG_XIUSISI[season]

    # 상세 계산 기록
    details = {
        "dayMaster": {
            "stem": day_stem,
            "element": day_stem_element,
            "baseScore": STEM_SCORE,
        },
        "season": {
            "monthBranch": month_branch,
            "seasonType": season,
            "ratios": season_ratios,
        },
        "helpingElements": helping_elems,
        "stems": [],
        "branches": [],
    }

    # 1. 일간 기본 점수 (40분)
    total_score = STEM_SCORE
    details["dayMaster"]["score"] = STEM_SCORE

    # 2. 천간 점수 계산 (년간, 월간, 시간)
    stems_score = 0
    for pos, stem in [("year", year_stem), ("month", month_stem), ("hour", hour_stem)]:
        if not stem:
            continue

        stem_idx = STEMS.index(stem)
        stem_elem = STEM_ELEM[stem_idx]
        ten_god = get_ten_god(day_stem, stem)

        # 비겁/인성인 경우만 점수 가산
        is_helping = ten_god in HELPING_STARS
        if is_helping:
            # 왕상휴수사 비율 적용
            wangxiang_ratio = season_ratios.get(stem_elem, 0.5)
            stem_score = STEM_SCORE * wangxiang_ratio
        else:
            stem_score = 0

        stems_score += stem_score
        details["stems"].append({
            "position": pos,
            "stem": stem,
            "element": stem_elem,
            "tenGod": ten_god,
            "isHelping": is_helping,
            "wangxiangRatio": season_ratios.get(stem_elem, 0.5),
            "score": round(stem_score, 1),
        })

    # 3. 지지 점수 계산 (년지, 월지, 일지, 시지)
    branches_score = 0
    for pos, branch in [("year", year_branch), ("month", month_branch),
                        ("day", day_branch), ("hour", hour_branch)]:
        if not branch:
            continue

        # 통근력 거리 계수
        distance_ratio = TONGGEUN_DISTANCE.get(pos, 0.9)

        # 지장간 분석
        jijanggan_list = JIJANGGAN_DETAIL.get(branch, [])
        branch_score = 0
        jj_details = []

        for jj_stem, jj_ratio in jijanggan_list:
            jj_stem_idx = STEMS.index(jj_stem)
            jj_elem = STEM_ELEM[jj_stem_idx]
            jj_ten_god = get_ten_god(day_stem, jj_stem)

            # 비겁/인성인 경우만 점수 가산
            is_helping = jj_ten_god in HELPING_STARS
            if is_helping:
                # 왕상휴수사 비율 적용
                wangxiang_ratio = season_ratios.get(jj_elem, 0.5)
                # 지장간 비율 점수 × 왕상휴수사 × 통근력 거리
                jj_score = jj_ratio * wangxiang_ratio * distance_ratio
            else:
                jj_score = 0

            branch_score += jj_score
            jj_details.append({
                "stem": jj_stem,
                "element": jj_elem,
                "ratio": jj_ratio,
                "tenGod": jj_ten_god,
                "isHelping": is_helping,
                "wangxiangRatio": season_ratios.get(jj_elem, 0.5),
                "score": round(jj_score, 1),
            })

        branches_score += branch_score

        # 지지 본기 기준 십성
        main_hidden_stem = BRANCH_MAIN_HS[branch]
        branch_ten_god = get_ten_god(day_stem, main_hidden_stem)

        details["branches"].append({
            "position": pos,
            "branch": branch,
            "distanceRatio": distance_ratio,
            "tenGod": branch_ten_god,
            "jijanggan": jj_details,
            "score": round(branch_score, 1),
        })

    # 총점 계산
    total_score = STEM_SCORE + stems_score + branches_score
    total_score = round(total_score, 1)

    # 신강/신약 판정
    level = "중화"
    for lv, (min_score, max_score) in STRENGTH_THRESHOLDS.items():
        if min_score <= total_score < max_score:
            level = lv
            break

    # 상위 분류 (신강/신약/중화)
    if level in ["극신약", "태약", "신약"]:
        strength = "신약"
    elif level in ["극신강", "태강", "신강"]:
        strength = "신강"
    else:
        strength = "중화"

    # 득령/득지/득세 판단
    month_branch_elem = BRANCH_ELEM[BRANCHES.index(month_branch)]
    deukryung = (month_branch_elem == bijob_elem) or (month_branch_elem == insung_elem)

    day_twelve_stage = TWELVE_STAGES.get(day_stem, {}).get(day_branch, "")
    strong_stages = {"장생", "관대", "건록", "제왕"}
    day_branch_main_elem = STEM_ELEM[STEMS.index(BRANCH_MAIN_HS[day_branch])]
    deukji = (day_branch_main_elem in [bijob_elem, insung_elem]) or (day_twelve_stage in strong_stages)

    # 득세: 비겁/인성 개수
    helping_count = sum(1 for d in details["stems"] if d.get("isHelping"))
    helping_count += sum(1 for d in details["branches"]
                        for jj in d.get("jijanggan", []) if jj.get("isHelping"))
    deukse = helping_count >= 4

    # 점수 상세
    details["stemsTotal"] = round(stems_score, 1)
    details["branchesTotal"] = round(branches_score, 1)

    return {
        "strength": strength,
        "level": level,
        "score": total_score,
        "maxScore": 560,
        "deukryung": deukryung,
        "deukryungDesc": "월지가 일간을 돕는 오행" if deukryung else "월지가 일간을 돕지 않음",
        "deukji": deukji,
        "deukjiDesc": "일지가 일간을 돕거나 12운성이 강함" if deukji else "일지가 일간을 돕지 않음",
        "deukse": deukse,
        "deukseDesc": f"비겁/인성 {helping_count}개" if deukse else f"비겁/인성 {helping_count}개 (약함)",
        "helpingCount": helping_count,
        "details": details,
        "calculation": {
            "dayMasterScore": STEM_SCORE,
            "stemsScore": round(stems_score, 1),
            "branchesScore": round(branches_score, 1),
            "total": total_score,
            "formula": "일간(40) + 천간점수 + 지지점수",
        },
    }


def calculate_strength(day_stem: str, pillars_raw: Dict) -> Dict[str, Any]:
    """
    신강/신약 계산 (기존 단순 버전 - 호환성 유지)
    실제로는 560점 체계 사용
    """
    # 560점 체계 계산
    result_560 = calculate_strength_560(day_stem, pillars_raw)

    # 기존 100점 체계로 변환 (호환성)
    score_100 = round(result_560["score"] / 560 * 100, 1)

    return {
        "strength": result_560["strength"],
        "level": result_560["level"],
        "strengthLevel": result_560["level"],  # 프론트엔드 호환용 alias
        "score": score_100,  # 100점 만점으로 변환
        "maxScore": 100,
        "score560": result_560["score"],  # 560점 체계 원본 점수
        "maxScore560": 560,
        "deukryung": result_560["deukryung"],
        "deukji": result_560["deukji"],
        "deukse": result_560["deukse"],
        "helpingCount": result_560["helpingCount"],
        "details": result_560["details"],
        "details560": result_560,  # 560점 체계 전체 상세
    }


# ============================================
# 신살 계산
# ============================================

def calculate_sinsal(pillars_raw: Dict, gender: str) -> Dict[str, Any]:
    """신살 20종 계산"""
    ilgan = pillars_raw["day"]["stem"]
    ilji = pillars_raw["day"]["branch"]
    wolji = pillars_raw["month"]["branch"]
    yeonji = pillars_raw["year"]["branch"]
    siji = pillars_raw.get("hour", {}).get("branch")
    ilju = ilgan + ilji if ilgan and ilji else ""

    all_gan = [pillars_raw[k].get("stem") for k in ["year", "month", "day", "hour"] if pillars_raw.get(k, {}).get("stem")]
    all_ji = [pillars_raw[k].get("branch") for k in ["year", "month", "day", "hour"] if pillars_raw.get(k, {}).get("branch")]
    all_chars = all_gan + all_ji
    ji_positions = {"year": yeonji, "month": wolji, "day": ilji, "hour": siji}

    result = {}

    # 1. 천을귀인
    guiin_ji = CHEONUL_GUIIN.get(ilgan, [])
    found = [ji for ji in all_ji if ji in guiin_ji]
    result["천을귀인"] = {"found": found, "has": bool(found)}

    # 2. 도화살
    dohwa_found = []
    for base, label in [(yeonji, "년지"), (ilji, "일지")]:
        if base:
            target = DOHWA.get(base)
            if target and target in all_ji:
                dohwa_found.append({"base": label, "target": target})
    result["도화살"] = {"found": dohwa_found, "has": bool(dohwa_found)}

    # 3. 역마살 (정통법 + 간편법)
    YEOKMA_CHARS = {"寅", "申", "巳", "亥"}  # 역마 글자 (생지)
    yeokma_found = []

    # 3-1. 정통법: 년지/일지 기준 삼합 생지의 충
    for base, label in [(yeonji, "년지"), (ilji, "일지")]:
        if base:
            target = YEOKMA.get(base)
            if target and target in all_ji:
                pos = [k for k, v in ji_positions.items() if v == target]
                yeokma_found.append({"base": label, "target": target, "positions": pos, "type": "정통"})

    # 3-2. 간편법: 寅申巳亥가 사주에 있으면 역마 기운
    yeokma_simple = []
    for pos, ji in ji_positions.items():
        if ji in YEOKMA_CHARS:
            yeokma_simple.append({"target": ji, "position": pos})

    result["역마살"] = {
        "found": yeokma_found,
        "has": bool(yeokma_found),
        "simple": yeokma_simple,  # 간편법 결과
        "hasSimple": bool(yeokma_simple)  # 간편법 기준 역마 기운 유무
    }

    # 4. 화개살
    hwagae_found = []
    for base, label in [(yeonji, "년지"), (ilji, "일지")]:
        if base:
            target = HWAGAE.get(base)
            if target and target in all_ji:
                hwagae_found.append({"base": label, "target": target})
    result["화개살"] = {"found": hwagae_found, "has": bool(hwagae_found)}

    # 5. 양인살
    yangin_target = YANGIN.get(ilgan)
    result["양인살"] = {"target": yangin_target, "has": yangin_target in all_ji if yangin_target else False}

    # 6. 괴강살
    result["괴강살"] = {"ilju": ilju, "has": ilju in GOEGANG_ILJU}

    # 7. 공망
    gongmang = get_gongmang(ilju)
    gongmang_in_saju = [ji for ji in all_ji if ji in gongmang]
    result["공망"] = {"target": gongmang, "found": gongmang_in_saju, "has": bool(gongmang_in_saju)}

    # 8. 원진살
    wonjin_found = []
    for i, ji1 in enumerate(all_ji):
        for j, ji2 in enumerate(all_ji):
            if i < j:
                for pair in WONJIN_PAIRS:
                    if ji1 in pair and ji2 in pair and ji1 != ji2:
                        wonjin_found.append(f"{ji1}-{ji2}")
    result["원진살"] = {"found": wonjin_found, "has": bool(wonjin_found)}

    # 9. 귀문관살
    gwimun_found = []
    for pair in GWIMUN_PAIRS:
        if pair[0] in all_ji and pair[1] in all_ji:
            gwimun_found.append(f"{pair[0]}{pair[1]}")
    result["귀문관살"] = {"found": gwimun_found, "has": bool(gwimun_found)}

    # 10. 백호살
    result["백호살"] = {"ilju": ilju, "has": ilju in BAEKHO_ILJU}

    # 11. 홍염살
    hongyeom_targets = HONGYEOM.get(ilgan, [])
    hongyeom_found = [ji for ji in all_ji if ji in hongyeom_targets]
    result["홍염살"] = {"found": hongyeom_found, "has": bool(hongyeom_found)}

    # 12. 천덕귀인
    cheonduk_target = CHEONDUK_GUIIN.get(wolji)
    result["천덕귀인"] = {"target": cheonduk_target, "has": cheonduk_target in all_chars if cheonduk_target else False}

    # 13. 월덕귀인
    wolduk_target = WOLDUK_GUIIN.get(wolji)
    result["월덕귀인"] = {"target": wolduk_target, "has": wolduk_target in all_gan if wolduk_target else False}

    # 14. 태극귀인
    taegeuk_ji = TAEGEUK_GUIIN.get(ilgan, [])
    taegeuk_found = [ji for ji in all_ji if ji in taegeuk_ji]
    result["태극귀인"] = {"found": taegeuk_found, "has": bool(taegeuk_found)}

    # 15. 문창귀인
    munchang_target = MUNCHANG_GUIIN.get(ilgan)
    result["문창귀인"] = {"target": munchang_target, "has": munchang_target in all_ji if munchang_target else False}

    # 16. 천의성
    chunui_target = get_chunui(wolji) if wolji else None
    result["천의성"] = {"target": chunui_target, "has": chunui_target in all_ji if chunui_target else False}

    # 17. 현침살
    hyunchim_found = [c for c in all_chars if c in HYUNCHIM_CHARS]
    result["현침살"] = {"found": hyunchim_found, "has": bool(hyunchim_found)}

    # 18. 고란살
    result["고란살"] = {"ilju": ilju, "has": ilju in GORAN_ILJU}

    # 19. 과숙살
    gwasuk_target = GWASUK.get(yeonji) if yeonji else None
    result["과숙살"] = {"target": gwasuk_target, "has": gwasuk_target in all_ji if gwasuk_target else False, "forGender": "female"}

    # 20. 고신살
    gosin_target = GOSIN.get(yeonji) if yeonji else None
    result["고신살"] = {"target": gosin_target, "has": gosin_target in all_ji if gosin_target else False, "forGender": "male"}

    # 활성화된 신살 요약
    active = []
    for name, info in result.items():
        if info.get("has"):
            if name == "과숙살" and gender != "female":
                continue
            if name == "고신살" and gender != "male":
                continue
            active.append(name)

    result["_active"] = active
    result["_activeCount"] = len(active)

    # === 주별 신살 매핑 (프론트 표시용) - 천간/지지 분리 ===
    by_pillar = {
        "year": {"stem": [], "branch": []},
        "month": {"stem": [], "branch": []},
        "day": {"stem": [], "branch": []},
        "hour": {"stem": [], "branch": []}
    }

    # 천간 위치 맵
    gan_positions = {
        "year": pillars_raw["year"].get("stem"),
        "month": pillars_raw["month"].get("stem"),
        "day": ilgan,
        "hour": pillars_raw.get("hour", {}).get("stem")
    }

    # 천을귀인: 일간 기준, 해당 지지가 있는 주에 표시 (지지 기준)
    if result["천을귀인"]["has"]:
        found_set = set(result["천을귀인"]["found"])
        for ji in found_set:
            for pos, branch in ji_positions.items():
                if branch == ji and "천을귀인" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("천을귀인")

    # 도화살: found에서 target 확인 (지지 기준)
    if result["도화살"]["has"]:
        for item in result["도화살"]["found"]:
            target = item.get("target")
            for pos, branch in ji_positions.items():
                if branch == target and "도화살" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("도화살")

    # 역마살: 정통법 + 간편법 모두 반영 (지지 기준)
    if result["역마살"]["has"]:
        for item in result["역마살"]["found"]:
            for pos in item.get("positions", []):
                if "역마살" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("역마살")
    if result["역마살"]["hasSimple"]:
        for item in result["역마살"]["simple"]:
            pos = item.get("position")
            if pos and "역마살" not in by_pillar[pos]["branch"]:
                by_pillar[pos]["branch"].append("역마살")

    # 화개살: found에서 target 확인 (지지 기준)
    if result["화개살"]["has"]:
        for item in result["화개살"]["found"]:
            target = item.get("target")
            for pos, branch in ji_positions.items():
                if branch == target and "화개살" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("화개살")

    # 양인살: target 지지가 있는 주 (지지 기준)
    if result["양인살"]["has"]:
        target = result["양인살"]["target"]
        for pos, branch in ji_positions.items():
            if branch == target:
                by_pillar[pos]["branch"].append("양인살")

    # 괴강살: 일주에만 해당
    if result["괴강살"]["has"]:
        by_pillar["day"]["branch"].append("괴강살")

    # 공망: found에 있는 지지가 어느 주인지 (지지 기준)
    if result["공망"]["has"]:
        for ji in result["공망"]["found"]:
            for pos, branch in ji_positions.items():
                if branch == ji:
                    by_pillar[pos]["branch"].append("공망")

    # 원진살: 관계된 두 주에 모두 표시 (지지 기준)
    if result["원진살"]["has"]:
        for pair_str in result["원진살"]["found"]:
            ji1, ji2 = pair_str.split("-")
            for pos, branch in ji_positions.items():
                if branch == ji1 or branch == ji2:
                    if "원진살" not in by_pillar[pos]["branch"]:
                        by_pillar[pos]["branch"].append("원진살")

    # 귀문관살: 해당 지지가 있는 주에 표시 (지지 기준)
    if result["귀문관살"]["has"]:
        for pair_str in result["귀문관살"]["found"]:
            for pos, branch in ji_positions.items():
                if branch and branch in pair_str:
                    if "귀문관살" not in by_pillar[pos]["branch"]:
                        by_pillar[pos]["branch"].append("귀문관살")

    # 백호살: 일주에만 해당
    if result["백호살"]["has"]:
        by_pillar["day"]["branch"].append("백호살")

    # 홍염살: found 지지가 있는 주 (지지 기준)
    if result["홍염살"]["has"]:
        for ji in result["홍염살"]["found"]:
            for pos, branch in ji_positions.items():
                if branch == ji and "홍염살" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("홍염살")

    # 천덕귀인: target이 있는 주 (천간/지지 모두 확인)
    if result["천덕귀인"]["has"]:
        target = result["천덕귀인"]["target"]
        for pos in ["year", "month", "day", "hour"]:
            if gan_positions.get(pos) == target:
                by_pillar[pos]["stem"].append("천덕귀인")
            if ji_positions.get(pos) == target:
                by_pillar[pos]["branch"].append("천덕귀인")

    # 월덕귀인: target 천간이 있는 주 (천간 기준)
    if result["월덕귀인"]["has"]:
        target = result["월덕귀인"]["target"]
        for pos, gan in gan_positions.items():
            if gan == target:
                by_pillar[pos]["stem"].append("월덕귀인")

    # 태극귀인: found 지지가 있는 주 (지지 기준)
    if result["태극귀인"]["has"]:
        for ji in result["태극귀인"]["found"]:
            for pos, branch in ji_positions.items():
                if branch == ji and "태극귀인" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("태극귀인")

    # 문창귀인: target 지지가 있는 주 (지지 기준)
    if result["문창귀인"]["has"]:
        target = result["문창귀인"]["target"]
        for pos, branch in ji_positions.items():
            if branch == target:
                by_pillar[pos]["branch"].append("문창귀인")

    # 천의성: target 지지가 있는 주 (지지 기준)
    if result["천의성"]["has"]:
        target = result["천의성"]["target"]
        for pos, branch in ji_positions.items():
            if branch == target:
                by_pillar[pos]["branch"].append("천의성")

    # 현침살: 해당 글자가 있는 주 (천간/지지 모두)
    if result["현침살"]["has"]:
        for char in result["현침살"]["found"]:
            for pos in ["year", "month", "day", "hour"]:
                if gan_positions.get(pos) == char and "현침살" not in by_pillar[pos]["stem"]:
                    by_pillar[pos]["stem"].append("현침살")
                if ji_positions.get(pos) == char and "현침살" not in by_pillar[pos]["branch"]:
                    by_pillar[pos]["branch"].append("현침살")

    # 고란살: 일주에만 해당
    if result["고란살"]["has"]:
        by_pillar["day"]["branch"].append("고란살")

    # 과숙살 (여성만): target 지지가 있는 주 (지지 기준)
    if result["과숙살"]["has"] and gender == "female":
        target = result["과숙살"]["target"]
        for pos, branch in ji_positions.items():
            if branch == target:
                by_pillar[pos]["branch"].append("과숙살")

    # 고신살 (남성만): target 지지가 있는 주 (지지 기준)
    if result["고신살"]["has"] and gender == "male":
        target = result["고신살"]["target"]
        for pos, branch in ji_positions.items():
            if branch == target:
                by_pillar[pos]["branch"].append("고신살")

    result["_byPillar"] = by_pillar

    return result


# ============================================
# 대운/세운/소운 계산 (lunar-python)
# ============================================

def calculate_daeun(bazi, gender: str, count: int = 10) -> List[Dict[str, Any]]:
    """대운 계산"""
    # gender: 1 = 남자, 0 = 여자
    gender_code = 1 if gender == "male" else 0
    yun = bazi.getYun(gender_code)

    result = {
        "startYear": yun.getStartYear(),
        "startMonth": yun.getStartMonth(),
        "startDay": yun.getStartDay(),
        "isForward": yun.isForward(),
        "direction": "순행" if yun.isForward() else "역행",
        "list": []
    }

    daeyun_arr = yun.getDaYun()
    for i, dy in enumerate(daeyun_arr[:count]):
        result["list"].append({
            "index": i,
            "startAge": dy.getStartAge(),
            "endAge": dy.getEndAge(),
            "startYear": dy.getStartYear(),
            "endYear": dy.getEndYear(),
            "ganZhi": dy.getGanZhi(),
        })

    return result


def calculate_saeun(daeyun) -> List[Dict[str, Any]]:
    """세운 (유년) 계산"""
    result = []
    liu_nian_arr = daeyun.getLiuNian()
    for ln in liu_nian_arr:
        result.append({
            "year": ln.getYear(),
            "age": ln.getAge(),
            "ganZhi": ln.getGanZhi(),
        })
    return result


def calculate_soun(daeyun) -> List[Dict[str, Any]]:
    """소운 계산"""
    result = []
    xiao_yun_arr = daeyun.getXiaoYun()
    for xy in xiao_yun_arr:
        result.append({
            "year": xy.getYear(),
            "age": xy.getAge(),
            "ganZhi": xy.getGanZhi(),
        })
    return result


# ============================================
# 천신 12신 / 길신 / 흉살 번역 테이블
# ============================================

# 천신 12신 (天神十二神) 번역
TIANSHEN_KOR = {
    "青龙": "청룡", "明堂": "명당", "金匮": "금궤", "天德": "천덕",
    "玉堂": "옥당", "司命": "사명", "天刑": "천형", "朱雀": "주작",
    "白虎": "백호", "天牢": "천뢰", "玄武": "현무", "勾陈": "구진",
}

# 천신 12신 길/흉 분류
TIANSHEN_TYPE = {
    "青龙": "길", "明堂": "길", "金匮": "길", "天德": "길", "玉堂": "길", "司命": "길",
    "天刑": "흉", "朱雀": "흉", "白虎": "흉", "天牢": "흉", "玄武": "흉", "勾陈": "흉",
}

# 길신 번역
JISHEN_KOR = {
    "天恩": "천은", "母仓": "모창", "时阳": "시양", "生气": "생기",
    "益后": "익후", "青龙": "청룡", "灾煞": "재살", "天火": "천화",
    "四忌": "사기", "八龙": "팔룡", "复日": "복일", "续世": "속세",
    "明堂": "명당", "天喜": "천희", "天医": "천의", "天仓": "천창",
    "要安": "요안", "五富": "오부", "圣心": "성심", "鸣犬": "명견",
    "天符": "천부", "天财": "천재", "天愿": "천원", "六合": "육합",
    "五合": "오합", "普护": "보호", "福生": "복생", "福德": "복덕",
    "时德": "시덕", "月德": "월덕", "天德": "천덕", "阳德": "양덕",
    "天岳": "천악", "三合": "삼합", "民日": "민일", "满德": "만덕",
    "月财": "월재", "月空": "월공", "王日": "왕일", "守日": "수일",
    "相日": "상일", "吉期": "길기", "天巫": "천무", "四相": "사상",
    "敬安": "경안", "临日": "임일", "不将": "불장", "驿马": "역마",
    "金匮": "금궤", "玉堂": "옥당", "司命": "사명", "天官": "천관",
    "月恩": "월은", "天贵": "천귀", "禄库": "녹고", "解神": "해신",
    "大进": "대진", "小进": "소진", "生財": "생재", "除神": "제신",
}

# 흉살 번역
XIONGSHA_KOR = {
    "月煞": "월살", "月虚": "월허", "血支": "혈지", "天刑": "천형",
    "月害": "월해", "月刑": "월형", "三娘煞": "삼낭살", "朱雀": "주작",
    "白虎": "백호", "天牢": "천뢰", "玄武": "현무", "勾陈": "구진",
    "八专": "팔전", "触水龙": "촉수룡", "五离": "오리", "月建转煞": "월건전살",
    "天贼": "천적", "六不成": "육불성", "火星": "화성", "重日": "중일",
    "天罡": "천강", "死气": "사기", "河魁": "하괴", "往亡": "왕망",
    "五虚": "오허", "八风": "팔풍", "九空": "구공", "五墓": "오묘",
    "归忌": "귀기", "单阴": "단음", "单阳": "단양", "孤辰": "고진",
    "大耗": "대모", "小耗": "소모", "四绝": "사절", "大时": "대시",
    "大败": "대패", "小时": "소시", "雷公": "뇌공", "地火": "지화",
    "瓦陷": "와함", "正四废": "정사폐", "傍四废": "방사폐",
    "九焦": "구초", "阴阳交破": "음양교파", "阴阳俱错": "음양구착",
    "四穷": "사궁", "朱雀黑道": "주작흑도", "天狗": "천구",
    "卧尸": "와시", "病符": "병부", "死符": "사부", "厌对": "염대",
    "天棒": "천봉", "地曩": "지낭", "灾煞": "재살", "受死": "수사",
    "四废": "사폐", "八座": "팔좌", "土府": "토부", "土符": "토부2",
    "阴错": "음착", "阳错": "양착", "阴阳击冲": "음양격충",
    "天吏": "천리", "致死": "치사", "四忌": "사기", "地囊": "지낭2",
    "岁薄": "세박", "逐阵": "축진", "阴将": "음장", "天地正转": "천지정전",
    "天地转杀": "천지전살", "反支": "반지", "刀砧": "도점",
    "游祸": "유화", "血忌": "혈기", "天狗下食": "천구하식", "五离": "오리",
    "九坎": "구감", "阴府": "음부", "行狠": "행흔", "了戾": "료려",
    "绝阳": "절양", "绝阴": "절음", "殃败": "앙패", "赤口": "적구",
    "罗天大退": "나천대퇴", "阴神": "음신", "阳神": "양신",
    "神隔": "신격", "鬼哭": "귀곡", "荒芜": "황무",
}

# 구성(九星) 번역 - 별이름 포함
JIUXING_KOR = {
    "一白水": "일백수", "二黑土": "이흑토", "三碧木": "삼벽목",
    "四绿木": "사록목", "五黄土": "오황토", "六白金": "육백금",
    "七赤金": "칠적금", "八白土": "팔백토", "九紫火": "구자화",
    # 별이름 포함 버전
    "一白水贪狼": "일백수 탐랑", "二黑土巨门": "이흑토 거문", "三碧木禄存": "삼벽목 녹존",
    "四绿木文曲": "사록목 문곡", "五黄土廉贞": "오황토 염정", "六白金武曲": "육백금 무곡",
    "七赤金破军": "칠적금 파군", "八白土左辅": "팔백토 좌보", "九紫火右弼": "구자화 우필",
    # 추가 변형
    "一白水天枢": "일백수 천추", "二黑土天璇": "이흑토 천선", "三碧木天玑": "삼벽목 천기",
    "四绿木天权": "사록목 천권", "五黄土玉衡": "오황토 옥형", "六白金开阳": "육백금 개양",
    "七赤金摇光": "칠적금 요광", "八白土招摇": "팔백토 초요", "九紫火梗河": "구자화 경하",
}

# 28수 번역
ERSHIBA_XIU_KOR = {
    "角": "각", "亢": "항", "氐": "저", "房": "방", "心": "심", "尾": "미", "箕": "기",
    "斗": "두", "牛": "우", "女": "녀", "虚": "허", "危": "위", "室": "실", "壁": "벽",
    "奎": "규", "娄": "루", "胃": "위", "昴": "묘", "毕": "필", "觜": "자", "参": "삼",
    "井": "정", "鬼": "귀", "柳": "류", "星": "성", "张": "장", "翼": "익", "轸": "진",
}

# 28수 동물 (28수길흉) - 중국어 동물명 -> 한글
ERSHIBA_XIU_ANIMAL = {
    "角": "교", "亢": "용", "氐": "담", "房": "토", "心": "호", "尾": "표", "箕": "수",
    "斗": "해", "牛": "우", "女": "박", "虚": "서", "危": "연", "室": "돈", "壁": "유",
    "奎": "랑", "娄": "구", "胃": "치", "昴": "계", "毕": "오", "觜": "원", "参": "원",
    "井": "안", "鬼": "양", "柳": "장", "星": "마", "张": "녹", "翼": "사", "轸": "인",
}

# 중국어 동물명 번역
ANIMAL_KOR = {
    "蛟": "교룡", "龙": "용", "貉": "담비", "兔": "토끼", "狐": "여우", "虎": "호랑이",
    "豹": "표범", "獬": "해태", "牛": "소", "蝠": "박쥐", "鼠": "쥐", "燕": "제비",
    "猪": "돼지", "狼": "늑대", "狗": "개", "雉": "꿩", "鸡": "닭", "乌": "까마귀",
    "猴": "원숭이", "猿": "원숭이", "犴": "큰사슴", "羊": "양", "獐": "노루",
    "马": "말", "鹿": "사슴", "蛇": "뱀", "蚓": "지렁이",
}

# 납음 (60갑자 오행) 번역
NAYIN_KOR = {
    # 金
    "海中金": "해중금", "剑锋金": "검봉금", "白蜡金": "백랍금",
    "砂中金": "사중금", "金箔金": "금박금", "钗钏金": "채천금",
    # 木
    "大林木": "대림목", "杨柳木": "양류목", "松柏木": "송백목",
    "平地木": "평지목", "桑柘木": "상자목", "石榴木": "석류목",
    # 水
    "涧下水": "간하수", "泉中水": "천중수", "长流水": "장류수",
    "天河水": "천하수", "大溪水": "대계수", "大海水": "대해수",
    # 火
    "炉中火": "노중화", "山头火": "산두화", "霹雳火": "벽력화",
    "山下火": "산하화", "佛灯火": "불등화", "天上火": "천상화",
    # 土
    "路旁土": "노방토", "城头土": "성두토", "屋上土": "옥상토",
    "壁上土": "벽상토", "大驿土": "대역토", "沙中土": "사중토",
}

# 중국어 띠 동물 번역
SHENGXIAO_KOR = {
    "鼠": "쥐", "牛": "소", "虎": "호랑이", "兔": "토끼", "龙": "용", "蛇": "뱀",
    "马": "말", "羊": "양", "猴": "원숭이", "鸡": "닭", "狗": "개", "猪": "돼지",
    "Tiger": "호랑이", "Rabbit": "토끼", "Rat": "쥐", "Ox": "소", "Dragon": "용",
    "Snake": "뱀", "Horse": "말", "Goat": "양", "Monkey": "원숭이", "Rooster": "닭",
    "Dog": "개", "Pig": "돼지",
}

# 건제12신 번역
JIANZHI_KOR = {
    "建": "건", "除": "제", "满": "만", "平": "평", "定": "정", "执": "집",
    "破": "파", "危": "위", "成": "성", "收": "수", "开": "개", "闭": "폐",
}

# 건제12신 길/흉 분류
JIANZHI_TYPE = {
    "建": "길", "除": "길", "满": "길", "平": "평", "定": "길", "执": "평",
    "破": "흉", "危": "흉", "成": "길", "收": "길", "开": "길", "闭": "흉",
}


# ============================================
# lunar-python 추가 기능 계산
# ============================================

def get_tianshen(lunar) -> Dict[str, Any]:
    """천신 12신 (시간의 신)"""
    ts = lunar.getTimeTianShen()
    ts_type = lunar.getTimeTianShenType()
    ts_luck = lunar.getTimeTianShenLuck()
    return {
        "name": ts,
        "nameKor": TIANSHEN_KOR.get(ts, ts),
        "type": ts_type,
        "typeKor": "길신" if ts_luck == "吉" else "흉살" if ts_luck == "凶" else ts_luck,
        "luck": ts_luck,
    }


def get_day_tianshen(lunar) -> Dict[str, Any]:
    """일간 천신"""
    ts = lunar.getDayTianShen()
    ts_type = lunar.getDayTianShenType()
    ts_luck = lunar.getDayTianShenLuck()
    return {
        "name": ts,
        "nameKor": TIANSHEN_KOR.get(ts, ts),
        "type": ts_type,
        "typeKor": "길신" if ts_luck == "吉" else "흉살" if ts_luck == "凶" else ts_luck,
        "luck": ts_luck,
    }


def get_jishen_list(lunar) -> Dict[str, Any]:
    """길신 목록"""
    day_yi = lunar.getDayYi()        # 일간 마땅한 것
    day_ji = lunar.getDayJi()        # 일간 꺼려야 할 것
    time_yi = lunar.getTimeYi()      # 시간 마땅한 것
    time_ji = lunar.getTimeJi()      # 시간 꺼려야 할 것

    day_jishen = lunar.getDayJiShen()      # 일간 길신
    # 시간 길신은 지원하지 않음

    return {
        "dayJiShen": [{"name": j, "nameKor": JISHEN_KOR.get(j, j)} for j in day_jishen],
        "dayYi": day_yi,      # 일간에 좋은 것들
        "dayJi": day_ji,      # 일간에 피해야 할 것들
        "timeYi": time_yi,    # 시간에 좋은 것들
        "timeJi": time_ji,    # 시간에 피해야 할 것들
    }


def get_xiongsha_list(lunar) -> Dict[str, Any]:
    """흉살 목록"""
    day_xiongsha = lunar.getDayXiongSha()      # 일간 흉살
    # 시간 흉살은 지원하지 않음

    return {
        "dayXiongSha": [{"name": x, "nameKor": XIONGSHA_KOR.get(x, x)} for x in day_xiongsha],
    }


def get_noble_direction(lunar) -> Dict[str, Any]:
    """귀인 방위"""
    try:
        xi_direction = lunar.getDayPositionXi()         # 희신 방위
        xi_desc = lunar.getDayPositionXiDesc()
        yang_guiren = lunar.getDayPositionYangGui()     # 양귀인 방위
        yang_desc = lunar.getDayPositionYangGuiDesc()
        yin_guiren = lunar.getDayPositionYinGui()       # 음귀인 방위
        yin_desc = lunar.getDayPositionYinGuiDesc()
        caishen = lunar.getDayPositionCai()             # 재신 방위
        cai_desc = lunar.getDayPositionCaiDesc()
        fushen = lunar.getDayPositionFu()               # 복신 방위
        fu_desc = lunar.getDayPositionFuDesc()

        return {
            "xiShen": {"direction": xi_direction, "directionDesc": xi_desc, "name": "희신", "desc": "기쁨의 신"},
            "yangGuiRen": {"direction": yang_guiren, "directionDesc": yang_desc, "name": "양귀인", "desc": "낮의 귀인"},
            "yinGuiRen": {"direction": yin_guiren, "directionDesc": yin_desc, "name": "음귀인", "desc": "밤의 귀인"},
            "caiShen": {"direction": caishen, "directionDesc": cai_desc, "name": "재신", "desc": "재물의 신"},
            "fuShen": {"direction": fushen, "directionDesc": fu_desc, "name": "복신", "desc": "복의 신"},
        }
    except:
        return {}


def get_jiuxing(lunar) -> Dict[str, Any]:
    """구성(九星) - 풍수 관련"""
    try:
        day_nine = lunar.getDayNineStar()
        month_nine = lunar.getMonthNineStar()
        year_nine = lunar.getYearNineStar()
        time_nine = lunar.getTimeNineStar()

        return {
            "day": {
                "name": day_nine.toString() if day_nine else None,
                "nameKor": JIUXING_KOR.get(day_nine.toString(), day_nine.toString()) if day_nine else None,
            },
            "month": {
                "name": month_nine.toString() if month_nine else None,
                "nameKor": JIUXING_KOR.get(month_nine.toString(), month_nine.toString()) if month_nine else None,
            },
            "year": {
                "name": year_nine.toString() if year_nine else None,
                "nameKor": JIUXING_KOR.get(year_nine.toString(), year_nine.toString()) if year_nine else None,
            },
            "time": {
                "name": time_nine.toString() if time_nine else None,
                "nameKor": JIUXING_KOR.get(time_nine.toString(), time_nine.toString()) if time_nine else None,
            },
        }
    except:
        return {}


def get_28xiu(lunar) -> Dict[str, Any]:
    """28수 - 별자리"""
    try:
        xiu = lunar.getXiu()        # 수
        zheng = lunar.getZheng()    # 정
        animal = lunar.getAnimal()  # 동물
        gong = lunar.getGong()      # 궁

        xiu_luck = lunar.getXiuLuck()     # 길흉
        xiu_song = lunar.getXiuSong()     # 시

        # 궁 방향 번역
        gong_kor = {"东": "동", "西": "서", "南": "남", "北": "북"}.get(gong, gong)
        # 길흉 번역
        luck_kor = {"吉": "길", "凶": "흉"}.get(xiu_luck, xiu_luck)

        return {
            "xiu": xiu,
            "xiuKor": ERSHIBA_XIU_KOR.get(xiu, xiu),
            "zheng": zheng,
            "animal": animal,
            "animalKor": ANIMAL_KOR.get(animal, animal),
            "gong": gong,
            "gongKor": gong_kor,
            "luck": xiu_luck,
            "luckKor": luck_kor,
            "song": xiu_song,
        }
    except:
        return {}


def get_jianzhi(lunar) -> Dict[str, Any]:
    """건제12신"""
    try:
        jz = lunar.getZhiXing()
        return {
            "name": jz,
            "nameKor": JIANZHI_KOR.get(jz, jz),
            "type": JIANZHI_TYPE.get(jz, "평"),
        }
    except:
        return {}


def get_chong(lunar) -> Dict[str, Any]:
    """충살 정보"""
    try:
        day_chong = lunar.getDayChong()         # 일충
        day_chong_desc = lunar.getDayChongDesc()    # 일충 설명
        day_chong_sha = lunar.getDayChongShengXiao()  # 일충 띠

        time_chong = lunar.getTimeChong()       # 시충
        time_chong_desc = lunar.getTimeChongDesc()  # 시충 설명
        time_chong_sha = lunar.getTimeChongShengXiao()  # 시충 띠

        # 지지 한글 번역
        day_chong_kor = BRANCH_KOR[BRANCHES.index(day_chong)] if day_chong in BRANCHES else day_chong
        time_chong_kor = BRANCH_KOR[BRANCHES.index(time_chong)] if time_chong in BRANCHES else time_chong

        return {
            "dayChong": {
                "branch": day_chong,
                "branchKor": day_chong_kor,
                "desc": day_chong_desc,
                "zodiac": day_chong_sha,
                "zodiacKor": SHENGXIAO_KOR.get(day_chong_sha, day_chong_sha),
            },
            "timeChong": {
                "branch": time_chong,
                "branchKor": time_chong_kor,
                "desc": time_chong_desc,
                "zodiac": time_chong_sha,
                "zodiacKor": SHENGXIAO_KOR.get(time_chong_sha, time_chong_sha),
            },
        }
    except:
        return {}


def get_taiyuan_minggong(bazi) -> Dict[str, Any]:
    """태원, 명궁, 신궁"""
    try:
        tai_yuan = bazi.getTaiYuan()    # 태원 (胎元)
        ming_gong = bazi.getMingGong()  # 명궁 (命宮)
        shen_gong = bazi.getShenGong()  # 신궁 (身宮)

        return {
            "taiYuan": {
                "ganZhi": tai_yuan,
                "name": "태원",
                "desc": "수태 시점의 천간지지, 선천적 기질과 체질",
            },
            "mingGong": {
                "ganZhi": ming_gong,
                "name": "명궁",
                "desc": "운명의 중심점, 성격과 인생의 방향",
            },
            "shenGong": {
                "ganZhi": shen_gong,
                "name": "신궁",
                "desc": "신체와 관련된 궁, 건강과 신체적 특성",
            },
        }
    except:
        return {}


def get_pengzu(lunar) -> Dict[str, Any]:
    """팽조백기 (彭祖百忌)"""
    try:
        peng_gan = lunar.getPengZuGan()   # 천간 팽조
        peng_zhi = lunar.getPengZuZhi()   # 지지 팽조

        return {
            "gan": peng_gan,
            "zhi": peng_zhi,
            "desc": "팽조백기 - 특정 일에 하면 안 되는 일들",
        }
    except:
        return {}


def get_month_nine_stars(lunar) -> Dict[str, Any]:
    """월별 구성(九星)"""
    try:
        return {
            "jiuXing": lunar.getMonthJiuXing().getName() if lunar.getMonthJiuXing() else None,
        }
    except:
        return {}


# ============================================
# 연애 지표 (loveFacts) 계산
# ============================================

# 도화(桃花) 룰 매핑 (전통 4국) - DOHWA와 동일
PEACH_MAP = {
    "寅": "卯", "午": "卯", "戌": "卯",
    "申": "酉", "子": "酉", "辰": "酉",
    "巳": "午", "酉": "午", "丑": "午",
    "亥": "子", "卯": "子", "未": "子",
}


def detect_peach_blossom(pillars_raw: Dict) -> Dict[str, Any]:
    """
    년지와 일지 기준 도화 표적지지와 실제 출현 위치(year/month/day/hour)
    - 년지 기준 도화: 년도 삼합에 따른 도화
    - 일지 기준 도화: 일주 삼합에 따른 도화
    둘 다 확인하여 도화살 존재 여부 판단
    """
    year_branch = pillars_raw.get("year", {}).get("branch")
    day_branch = pillars_raw.get("day", {}).get("branch")

    # 년지 기준 도화 타겟
    target_from_year = PEACH_MAP.get(year_branch) if year_branch else None
    # 일지 기준 도화 타겟
    target_from_day = PEACH_MAP.get(day_branch) if day_branch else None

    positions = []
    targets = set()

    ji_positions = {
        "year": pillars_raw.get("year", {}).get("branch"),
        "month": pillars_raw.get("month", {}).get("branch"),
        "day": pillars_raw.get("day", {}).get("branch"),
        "hour": pillars_raw.get("hour", {}).get("branch"),
    }

    # 년지 기준 도화 확인
    if target_from_year:
        targets.add(target_from_year)
        for k, branch in ji_positions.items():
            if branch == target_from_year and k not in positions:
                positions.append(k)

    # 일지 기준 도화 확인
    if target_from_day:
        targets.add(target_from_day)
        for k, branch in ji_positions.items():
            if branch == target_from_day and k not in positions:
                positions.append(k)

    # 타겟 지지들을 문자열로 변환
    target_branches = list(targets) if targets else None

    return {
        "targetBranch": target_branches or [],  # 항상 배열로 반환
        "targetFromYear": target_from_year,
        "targetFromDay": target_from_day,
        "positions": positions,
        "hasPeach": bool(positions)
    }


def spouse_stars_presence(pillars: Dict, gender: str) -> Dict[str, Any]:
    """
    배우자 별 등장 여부 요약:
      - 남성: 재성(정재/편재)
      - 여성: 관성(정관/편관)
    각 주의 '천간 십성', '지지 십성' 둘 다 체크
    """
    target_set = {"정재", "편재"} if gender == "male" else {"정관", "편관"}
    positions = []
    detail = {}
    count = 0

    for k in ["year", "month", "day", "hour"]:
        p = pillars.get(k, {})
        tg_s = p.get("tenGodStem")
        tg_b = p.get("tenGodBranch")
        hit = []
        if tg_s in target_set:
            hit.append(("stem", tg_s))
        if tg_b in target_set:
            hit.append(("branch", tg_b))
        if hit:
            positions.append(k)
            count += len(hit)
            detail[k] = hit

    return {
        "targetStars": sorted(list(target_set)),
        "positions": positions,
        "hitCount": count,
        "detail": detail
    }


def calculate_love_facts(pillars: Dict, pillars_raw: Dict, gender: str, five_elements: Dict) -> Dict[str, Any]:
    """연애 관련 정보 계산"""
    # 도화 분석
    peach = detect_peach_blossom(pillars_raw)

    # 배우자별 분석
    spouse = spouse_stars_presence(pillars, gender)

    # 오행 한자 퍼센트
    fe_hanja = five_elements.get("percentHanja", {})

    return {
        "hourKnown": pillars_raw.get("hour", {}).get("stem") is not None,
        "peachBlossom": peach,
        "spouseStars": spouse,
        "fiveElementsHanjaPercent": fe_hanja,
        "dayMasterStrength": five_elements.get("strength", ""),
        "spouseTargetType": "재성" if gender == "male" else "관성"
    }


# ============================================
# 대운/연운/월운 상세 계산
# ============================================

def get_luck_pillar_info(day_stem: str, gan: str, zhi: str) -> Dict[str, Any]:
    """운(대운/연운/월운)의 간지에 대한 상세 정보 계산"""
    if not gan or not zhi:
        return {}

    # 천간 정보
    gan_idx = STEMS.index(gan)
    gan_elem = STEM_ELEM[gan_idx]
    gan_kor = STEM_KOR[gan_idx]

    # 지지 정보
    zhi_idx = BRANCHES.index(zhi)
    zhi_elem = BRANCH_ELEM[zhi_idx]
    zhi_kor = BRANCH_KOR[zhi_idx]

    # 천간 십성
    ten_god_stem = get_ten_god(day_stem, gan)

    # 지지 십성 (정기 기준)
    main_hidden_stem = BRANCH_MAIN_HS[zhi]
    ten_god_branch = get_ten_god(day_stem, main_hidden_stem)

    # 12운성
    twelve_stage = get_twelve_stage(day_stem, zhi)

    return {
        "ganZhi": gan + zhi,
        "ganZhiKor": gan_kor + zhi_kor,
        "stem": {
            "char": gan,
            "korean": gan_kor,
            "element": gan_elem,
            "elementHanja": ELEM_HANJA[gan_elem],
            "color": ELEM_COLOR[gan_elem],
            "tenGod": ten_god_stem,
        },
        "branch": {
            "char": zhi,
            "korean": zhi_kor,
            "element": zhi_elem,
            "elementHanja": ELEM_HANJA[zhi_elem],
            "color": ELEM_COLOR[zhi_elem],
            "tenGod": ten_god_branch,
            "twelveStage": twelve_stage,
        },
        "tenGodStem": ten_god_stem,
        "tenGodBranch": ten_god_branch,
        "twelveStage": twelve_stage,
    }


def calculate_daeun_detailed(bazi, day_stem: str, gender: str, count: int = 10) -> Dict[str, Any]:
    """대운 상세 계산 (십성, 12운성 포함)"""
    gender_code = 1 if gender == "male" else 0
    yun = bazi.getYun(gender_code)

    result = {
        "startYear": yun.getStartYear(),
        "startMonth": yun.getStartMonth(),
        "startDay": yun.getStartDay(),
        "isForward": yun.isForward(),
        "direction": "순행" if yun.isForward() else "역행",
        "list": []
    }

    daeyun_arr = yun.getDaYun()
    for i, dy in enumerate(daeyun_arr[:count]):
        ganzi = dy.getGanZhi()
        if ganzi and len(ganzi) >= 2:
            gan, zhi = ganzi[0], ganzi[1]
            pillar_info = get_luck_pillar_info(day_stem, gan, zhi)
        else:
            pillar_info = {}

        result["list"].append({
            "index": i,
            "startAge": dy.getStartAge(),
            "endAge": dy.getEndAge(),
            "startYear": dy.getStartYear(),
            "endYear": dy.getEndYear(),
            **pillar_info,
        })

    return result


def calculate_yeonun_detailed(bazi, day_stem: str, _gender: str, start_year: int = None, count: int = 10) -> List[Dict[str, Any]]:
    """연운(세운/유년) 상세 계산 - 특정 연도부터 count개 (_gender는 API 일관성용)"""
    from lunar_python import Solar

    result = []

    # start_year가 없으면 현재 연도부터
    if start_year is None:
        import datetime
        start_year = datetime.datetime.now().year

    for i in range(count):
        target_year = start_year + i
        try:
            # 해당 연도의 간지 계산 (6월 중순 기준)
            solar = Solar.fromYmd(target_year, 6, 15)
            lunar = solar.getLunar()
            year_bazi = lunar.getEightChar()
            year_ganzi = year_bazi.getYear()

            if year_ganzi and len(year_ganzi) >= 2:
                gan, zhi = year_ganzi[0], year_ganzi[1]
                pillar_info = get_luck_pillar_info(day_stem, gan, zhi)
            else:
                pillar_info = {}

            # 나이 계산 (한국 나이)
            birth_year = bazi.getLunar().getSolar().getYear()
            age = target_year - birth_year + 1

            result.append({
                "year": target_year,
                "age": age,
                **pillar_info,
            })
        except Exception:
            continue

    return result


def calculate_wolun_detailed(day_stem: str, target_year: int) -> List[Dict[str, Any]]:
    """월운 상세 계산 - 특정 연도의 12개월"""
    from lunar_python import Solar

    result = []

    for month in range(1, 13):
        try:
            # 해당 월의 간지 계산 (월 중순 기준)
            solar = Solar.fromYmd(target_year, month, 15)
            lunar = solar.getLunar()
            month_bazi = lunar.getEightChar()
            month_ganzi = month_bazi.getMonth()

            if month_ganzi and len(month_ganzi) >= 2:
                gan, zhi = month_ganzi[0], month_ganzi[1]
                pillar_info = get_luck_pillar_info(day_stem, gan, zhi)
            else:
                pillar_info = {}

            result.append({
                "month": month,
                **pillar_info,
            })
        except Exception:
            continue

    return result


def calculate_all_luck_cycles(
    bazi,
    day_stem: str,
    gender: str,
    current_year: int = None
) -> Dict[str, Any]:
    """대운/연운/월운 통합 계산"""
    import datetime

    if current_year is None:
        current_year = datetime.datetime.now().year

    # 대운 (10개)
    daeun = calculate_daeun_detailed(bazi, day_stem, gender, 10)

    # 연운 (현재 연도 기준 앞뒤 5년씩, 총 11년)
    yeonun = calculate_yeonun_detailed(bazi, day_stem, gender, current_year - 5, 11)

    # 월운 (현재 연도)
    wolun = calculate_wolun_detailed(day_stem, current_year)

    return {
        "daeun": daeun,
        "yeonun": yeonun,
        "wolun": wolun,
        "currentYear": current_year,
    }


# ============================================
# 오행 분포 계산
# ============================================

def calculate_five_elements(pillars_raw: Dict) -> Dict[str, Any]:
    """오행 분포 계산"""
    score = {"wood": 0.0, "fire": 0.0, "earth": 0.0, "metal": 0.0, "water": 0.0}

    for k in ["year", "month", "day", "hour"]:
        p = pillars_raw.get(k) or {}
        s, b = p.get("stem"), p.get("branch")
        if s:
            score[STEM_ELEM[STEMS.index(s)]] += 1.0
        if b:
            score[BRANCH_ELEM[BRANCHES.index(b)]] += 0.7

    total = sum(score.values()) or 1.0
    percent = {k: round(v * 100 / total, 1) for k, v in score.items()}
    percent_hanja = {ELEM_HANJA[k]: v for k, v in percent.items()}

    return {
        "score": score,
        "percent": percent,
        "percentHanja": percent_hanja,
    }


# ============================================
# 메인 계산 함수
# ============================================

def compute_all(
    name: Optional[str],
    gender: str,
    year: int,
    month: int,
    day: int,
    hour: Optional[int] = None,
    minute: Optional[int] = None,
    is_lunar: bool = False,
    place: Optional[str] = None
) -> Dict[str, Any]:
    """
    전체 사주 계산

    Args:
        name: 이름
        gender: 성별 ("male" / "female")
        year: 년
        month: 월
        day: 일
        hour: 시 (None이면 시주 계산 안함)
        minute: 분 (None이면 0)
        is_lunar: 음력 여부 (기본 False = 양력)
        place: 장소
    """
    # 시간 입력 여부
    has_time = hour is not None

    # 시간 없으면 12:00으로 임시 계산 (년/월/일주만 필요)
    calc_hour = hour if hour is not None else 12
    calc_minute = minute if minute is not None else 0

    # Solar 객체 생성
    if is_lunar:
        lunar = Lunar.fromYmdHms(year, month, day, calc_hour, calc_minute, 0)
        solar = lunar.getSolar()
    else:
        solar = Solar.fromYmdHms(year, month, day, calc_hour, calc_minute, 0)
        lunar = solar.getLunar()

    # 팔자 객체
    bazi = lunar.getEightChar()

    # 기본 정보
    day_stem = bazi.getDay()[0]  # 일간

    # 사주 팔자 (시간 없으면 시주는 None)
    if has_time:
        pillars_raw = {
            "year": {"stem": bazi.getYear()[0], "branch": bazi.getYear()[1]},
            "month": {"stem": bazi.getMonth()[0], "branch": bazi.getMonth()[1]},
            "day": {"stem": bazi.getDay()[0], "branch": bazi.getDay()[1]},
            "hour": {"stem": bazi.getTime()[0], "branch": bazi.getTime()[1]},
        }
    else:
        pillars_raw = {
            "year": {"stem": bazi.getYear()[0], "branch": bazi.getYear()[1]},
            "month": {"stem": bazi.getMonth()[0], "branch": bazi.getMonth()[1]},
            "day": {"stem": bazi.getDay()[0], "branch": bazi.getDay()[1]},
            "hour": {"stem": None, "branch": None},  # 시간 미입력
        }

    # 각 주별 상세 정보
    pillars = {}
    for key in ["year", "month", "day", "hour"]:
        stem = pillars_raw[key]["stem"]
        branch = pillars_raw[key]["branch"]

        # 시주가 None인 경우 (시간 미입력)
        if stem is None or branch is None:
            pillars[key] = {
                "ganZhi": None,
                "ganZhiKor": None,
                "stem": None,
                "branch": None,
                "tenGodStem": None,
                "tenGodBranch": None,
                "tenGodBranchMain": None,
                "twelveStage": None,
                "twelveSinsal": None,
                "jijanggan": None,
                "naYin": None,
                "naYinKor": None,
            }
            continue

        stem_info = get_stem_info(stem)
        branch_info = get_branch_info(branch)

        # 십성
        ten_god_stem = get_ten_god(day_stem, stem) if key != "day" else "비견"
        ten_god_branch = get_ten_god(day_stem, BRANCH_MAIN_HS[branch])

        # 12운성
        twelve_stage = get_twelve_stage(day_stem, branch)

        # 12신살 (년지 기준)
        twelve_sinsal = get_twelve_sinsal(pillars_raw["year"]["branch"], branch)

        # 지장간
        jijanggan = get_jijanggan(branch)

        # 납음 (lunar-python)
        if key == "year":
            nayin = bazi.getYearNaYin()
        elif key == "month":
            nayin = bazi.getMonthNaYin()
        elif key == "day":
            nayin = bazi.getDayNaYin()
        else:
            nayin = bazi.getTimeNaYin()

        pillars[key] = {
            "ganZhi": stem + branch,
            "ganZhiKor": stem_info["korean"] + branch_info["korean"],
            "stem": stem_info,
            "branch": branch_info,
            "tenGodStem": ten_god_stem,
            "tenGodBranch": ten_god_branch,
            "tenGodBranchMain": ten_god_branch,  # saju_love.py 호환용
            "twelveStage": twelve_stage,
            "twelveSinsal": twelve_sinsal,
            "jijanggan": jijanggan,
            "naYin": nayin,
            "naYinKor": NAYIN_KOR.get(nayin, nayin),
        }

    # 일간 정보
    day_master = get_stem_info(day_stem)
    day_master["title"] = day_master["korean"] + ELEM_KOR[day_master["element"]]

    # 오행 분포
    five_elements = calculate_five_elements(pillars_raw)

    # 신강/신약
    strength = calculate_strength(day_stem, pillars_raw)
    five_elements.update(strength)

    # 신살
    sinsal = calculate_sinsal(pillars_raw, gender)

    # 대운 (lunar-python) - 기본 버전
    daeun = calculate_daeun(bazi, gender, 10)

    # 대운/연운/월운 상세 버전 (십성, 12운성 포함)
    import datetime
    current_year = datetime.datetime.now().year
    luck_cycles = calculate_all_luck_cycles(bazi, day_stem, gender, current_year)

    # 현재 대운의 세운/소운 (첫 번째 대운)
    gender_code = 1 if gender == "male" else 0
    yun = bazi.getYun(gender_code)
    daeyun_arr = yun.getDaYun()

    current_saeun = []
    current_soun = []
    if len(daeyun_arr) > 1:
        first_daeyun = daeyun_arr[1]  # 첫 대운 (0은 대운 전)
        current_saeun = calculate_saeun(first_daeyun)
        current_soun = calculate_soun(first_daeyun)

    # 띠
    zodiac_idx = BRANCHES.index(pillars_raw["year"]["branch"])

    # lunar-python 추가 기능
    tianshen_time = get_tianshen(lunar)
    tianshen_day = get_day_tianshen(lunar)
    jishen = get_jishen_list(lunar)
    xiongsha = get_xiongsha_list(lunar)
    noble_direction = get_noble_direction(lunar)
    jiuxing = get_jiuxing(lunar)
    xiu_28 = get_28xiu(lunar)
    jianzhi = get_jianzhi(lunar)
    chong = get_chong(lunar)
    taiyuan_minggong = get_taiyuan_minggong(bazi)
    pengzu = get_pengzu(lunar)

    # 연애 지표 (loveFacts)
    love_facts = calculate_love_facts(pillars, pillars_raw, gender, five_elements)

    return {
        "input": {
            "name": name,
            "gender": gender,
            "genderKor": "남자" if gender == "male" else "여자",
            "solar": f"{solar.getYear()}-{solar.getMonth():02d}-{solar.getDay():02d}",
            "solarTime": f"{hour:02d}:{minute or 0:02d}" if has_time else None,
            "lunar": f"{lunar.getYear()}-{lunar.getMonth():02d}-{lunar.getDay():02d}",
            "isLunar": is_lunar,
            "hasTime": has_time,  # 시간 입력 여부
            "place": place,
        },
        "dayMaster": day_master,
        "pillars": pillars,
        "pillarsRaw": pillars_raw,
        "zodiac": {
            "char": BRANCHES[zodiac_idx],
            "korean": BRANCH_KOR[zodiac_idx],
            "animal": ZODIAC[zodiac_idx],
            "animalKor": ZODIAC_KOR[zodiac_idx],
        },
        "fiveElements": five_elements,
        "sinsal": sinsal,
        "daeun": daeun,
        "luckCycles": luck_cycles,  # 대운/연운/월운 상세 버전
        "currentSaeun": current_saeun[:5],  # 첫 5년
        "currentSoun": current_soun[:5],    # 첫 5년
        "jieQi": {
            "current": lunar.getJieQi(),
            "prev": lunar.getPrevJieQi().getName() if lunar.getPrevJieQi() else None,
            "next": lunar.getNextJieQi().getName() if lunar.getNextJieQi() else None,
        },
        # lunar-python 추가 기능
        "tianShen": {
            "day": tianshen_day,
            "time": tianshen_time,
        },
        "jiShen": jishen,
        "xiongSha": xiongsha,
        "nobleDirection": noble_direction,
        "jiuXing": jiuxing,
        "xiu28": xiu_28,
        "jianZhi": jianzhi,
        "chong": chong,
        "gong": taiyuan_minggong,
        "pengZu": pengzu,
        # 연애 지표
        "loveFacts": love_facts,
    }


# ============================================
# 테스트
# ============================================

if __name__ == "__main__":
    # 테스트: 1994년 1월 10일 18시 15분, 남자
    result = compute_all(
        name="테스트",
        gender="male",
        year=1994,
        month=1,
        day=10,
        hour=18,
        minute=15,
        is_lunar=False
    )

    print("=" * 60)
    print("사주 분석 결과 (1994-01-10 18:15 남자)")
    print("=" * 60)

    print("\n=== 사주 팔자 ===")
    key_kor = {"year": "년주", "month": "월주", "day": "일주", "hour": "시주"}
    for key in ["year", "month", "day", "hour"]:
        p = result["pillars"][key]
        print(f"{key_kor[key]}: {p['ganZhi']} ({p['ganZhiKor']}) | 십성: {p['tenGodStem']}/{p['tenGodBranch']} | 12운성: {p['twelveStage']} | 납음: {p['naYinKor']}")

    print("\n=== 일간 ===")
    dm = result["dayMaster"]
    print(f"{dm['char']} ({dm['korean']}) - {dm['elementHanja']} {dm['yinYangKor']}")

    print("\n=== 오행 분포 ===")
    for elem, pct in result["fiveElements"]["percentHanja"].items():
        print(f"{elem}: {pct}%")

    print("\n=== 신강/신약 (560점 체계) ===")
    fe = result["fiveElements"]
    print(f"판정: {fe['strength']} ({fe['level']})")
    print(f"점수: {fe.get('score560', fe['score'])}/{fe.get('maxScore560', 560)} (100점 환산: {fe['score']})")
    print(f"득령: {fe['deukryung']} | 득지: {fe['deukji']} | 득세: {fe['deukse']}")

    # 560점 체계 상세
    if "details560" in fe:
        d560 = fe["details560"]
        calc = d560.get("calculation", {})
        print(f"\n  계산 상세:")
        print(f"    일간 기본: {calc.get('dayMasterScore', 40)}분")
        print(f"    천간 점수: {calc.get('stemsScore', 0)}분")
        print(f"    지지 점수: {calc.get('branchesScore', 0)}분")
        print(f"    총점: {calc.get('total', 0)}분")

    print("\n=== 신살 ===")
    print(f"활성화: {result['sinsal']['_active']}")

    print("\n=== 대운 ===")
    daeun = result["daeun"]
    print(f"시작: {daeun['startYear']}년 {daeun['startMonth']}월 {daeun['startDay']}일")
    print(f"방향: {daeun['direction']}")
    print("\n대운 목록:")
    for dy in daeun["list"]:
        print(f"  {dy['startAge']:2d}세 ~ {dy['endAge']:2d}세: {dy['ganZhi']}")

    print("\n=== 세운 (첫 대운) ===")
    for sy in result["currentSaeun"]:
        print(f"  {sy['year']}년 ({sy['age']}세): {sy['ganZhi']}")

    print("\n=== 천신 12신 ===")
    ts = result.get("tianShen", {})
    if ts.get("day"):
        print(f"일간: {ts['day'].get('nameKor', '')} ({ts['day'].get('typeKor', '')})")
    if ts.get("time"):
        print(f"시간: {ts['time'].get('nameKor', '')} ({ts['time'].get('typeKor', '')})")

    print("\n=== 길신 ===")
    jishen = result.get("jiShen", {})
    day_jishen = jishen.get("dayJiShen", [])
    if day_jishen:
        print(f"일간 길신: {', '.join([j['nameKor'] for j in day_jishen[:5]])}")
    day_yi = jishen.get("dayYi", [])
    if day_yi:
        print(f"일간 좋은일: {', '.join(day_yi[:5])}")

    print("\n=== 흉살 ===")
    xiongsha = result.get("xiongSha", {})
    day_xiong = xiongsha.get("dayXiongSha", [])
    if day_xiong:
        print(f"일간 흉살: {', '.join([x['nameKor'] for x in day_xiong[:5]])}")

    print("\n=== 귀인 방위 ===")
    noble = result.get("nobleDirection", {})
    if noble:
        for key, val in noble.items():
            if val:
                print(f"{val.get('name', key)}: {val.get('direction', '')} ({val.get('directionDesc', '')})")

    print("\n=== 구성(九星) ===")
    jiuxing = result.get("jiuXing", {})
    if jiuxing:
        for key in ["year", "month", "day", "time"]:
            jx = jiuxing.get(key, {})
            if jx and jx.get("nameKor"):
                label = {"year": "년", "month": "월", "day": "일", "time": "시"}.get(key, key)
                print(f"  {label}: {jx.get('nameKor', '')}")

    print("\n=== 28수 ===")
    xiu = result.get("xiu28", {})
    if xiu:
        print(f"{xiu.get('xiuKor', xiu.get('xiu', ''))}수 ({xiu.get('gongKor', xiu.get('gong', ''))}궁) - {xiu.get('luckKor', xiu.get('luck', ''))}")
        print(f"  동물: {xiu.get('animalKor', xiu.get('animal', ''))}")

    print("\n=== 건제12신 ===")
    jz = result.get("jianZhi", {})
    if jz:
        print(f"{jz.get('nameKor', '')} ({jz.get('type', '')})")

    print("\n=== 태원/명궁/신궁 ===")
    gong = result.get("gong", {})
    for key in ["taiYuan", "mingGong", "shenGong"]:
        g = gong.get(key, {})
        if g:
            print(f"{g.get('name', '')}: {g.get('ganZhi', '')}")

    print("\n=== 충살 ===")
    chong = result.get("chong", {})
    if chong.get("dayChong"):
        dc = chong["dayChong"]
        print(f"일충: {dc.get('branchKor', dc.get('branch', ''))} ({dc.get('zodiacKor', dc.get('zodiac', ''))})")
    if chong.get("timeChong"):
        tc = chong["timeChong"]
        print(f"시충: {tc.get('branchKor', tc.get('branch', ''))} ({tc.get('zodiacKor', tc.get('zodiac', ''))})")

    print("\n=== 연애 지표 (loveFacts) ===")
    lf = result.get("loveFacts", {})
    print(f"시간 입력: {lf.get('hourKnown', False)}")
    print(f"배우자 별 타입: {lf.get('spouseTargetType', '')}")
    pb = lf.get("peachBlossom", {})
    print(f"도화살: {pb.get('hasPeach', False)} - 위치: {pb.get('positions', [])}")
    sp = lf.get("spouseStars", {})
    print(f"배우자별: {sp.get('targetStars', [])} - 위치: {sp.get('positions', [])} ({sp.get('hitCount', 0)}개)")

    print("\n=== 신살 주별 매핑 (_byPillar) ===")
    by_pillar = result["sinsal"].get("_byPillar", {})
    for pos in ["year", "month", "day", "hour"]:
        pos_kor = {"year": "년주", "month": "월주", "day": "일주", "hour": "시주"}[pos]
        stem_list = by_pillar.get(pos, {}).get("stem", [])
        branch_list = by_pillar.get(pos, {}).get("branch", [])
        if stem_list or branch_list:
            print(f"{pos_kor}: 천간={stem_list}, 지지={branch_list}")

    print("\n=== 역마살 상세 ===")
    yeokma = result["sinsal"].get("역마살", {})
    print(f"정통법: {yeokma.get('has', False)} - {yeokma.get('found', [])}")
    print(f"간편법: {yeokma.get('hasSimple', False)} - {yeokma.get('simple', [])}")
