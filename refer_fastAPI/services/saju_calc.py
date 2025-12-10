# services/saju_calc.py
from typing import Dict, Any, Optional, Tuple
from sajupy import calculate_saju, lunar_to_solar  # pip install sajupy

# === 1) 기본 테이블 ===
STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
STEM_ELEM = ["wood","wood","fire","fire","earth","earth","metal","metal","water","water"]
STEM_YIN  = ["yang","yin","yang","yin","yang","yin","yang","yin","yang","yin"]
STEM_KOR  = ["갑","을","병","정","무","기","경","신","임","계"]

BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]
BRANCH_ELEM = ["water","earth","wood","wood","earth","fire","fire","earth","metal","metal","earth","water"]
BRANCH_YIN  = ["yang","yin","yang","yin","yang","yin","yang","yin","yang","yin","yang","yin"]
BRANCH_KOR  = ["자","축","인","묘","진","사","오","미","신","유","술","해"]
ZODIAC      = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"]

# 지지 지장간 본기(本氣) - 십성 계산 기준
# 子:癸, 丑:己, 寅:甲, 卯:乙, 辰:戊, 巳:丙, 午:丁, 未:己, 申:庚, 酉:辛, 戌:戊, 亥:壬
BRANCH_MAIN_HS = {
    "子":"癸","丑":"己","寅":"甲","卯":"乙","辰":"戊","巳":"丙","午":"丁","未":"己","申":"庚","酉":"辛","戌":"戊","亥":"壬"
}

# 오행 → 색상
ELEM_COLOR = {
    "wood":  "#2aa86c",  # 초록
    "fire":  "#ff6a6a",  # 빨강
    "earth": "#caa46a",  # 황갈
    "metal": "#b8bec6",  # 회백
    "water": "#6aa7ff",  # 파랑
}
YANG_STEMS = {"甲","丙","戊","庚","壬"}  # 양일간

# 오행 한자 라벨(표시용)
ELEM_HANJA = {"wood":"木","fire":"火","earth":"土","metal":"金","water":"水"}

# 도화(桃花) 룰 매핑 (전통 4국)
PEACH_MAP = {
    "寅":"卯","午":"卯","戌":"卯",
    "申":"酉","子":"酉","辰":"酉",
    "巳":"午","酉":"午","丑":"午",
    "亥":"子","卯":"子","未":"子",
}

# === 2) 유틸 ===
def stem_info(stem: str) -> Dict[str, Any]:
    i = STEMS.index(stem)
    elem = STEM_ELEM[i]
    return {
        "char": stem,
        "korean": STEM_KOR[i],
        "stemKey": ["jia","yi","bing","ding","wu","ji","geng","xin","ren","gui"][i],
        "element": elem,
        "yinYang": STEM_YIN[i],
        "title": ["갑목","을목","병화","정화","무토","기토","경금","신금","임수","계수"][i],
        "color": ELEM_COLOR[elem],
    }

def branch_info(branch: str) -> Dict[str, Any]:
    i = BRANCHES.index(branch)
    elem = BRANCH_ELEM[i]
    return {
        "char": branch,
        "korean": BRANCH_KOR[i],
        "branchKey": ["zi","chou","yin","mao","chen","si","wu","wei","shen","you","xu","hai"][i],
        "element": elem,
        "yinYang": BRANCH_YIN[i],
        "zodiac": ZODIAC[i],
        "mainHiddenStem": BRANCH_MAIN_HS[branch],
        "color": ELEM_COLOR[elem],
    }

def ten_god(day_stem: str, target_stem: str) -> str:
    """일간 vs 타천간 → 십성

    편(偏)/정(正) 구분: 일간과 대상의 음양이 같으면 편, 다르면 정
    """
    elem_idx = {"wood":0,"fire":1,"earth":2,"metal":3,"water":4}
    me_e = STEM_ELEM[STEMS.index(day_stem)]
    me_y = STEM_YIN[STEMS.index(day_stem)]
    tg_e = STEM_ELEM[STEMS.index(target_stem)]
    tg_y = STEM_YIN[STEMS.index(target_stem)]

    # 음양이 같으면 편(偏), 다르면 정(正)
    is_same_yinyang = (me_y == tg_y)

    me = elem_idx[me_e]; tg = elem_idx[tg_e]
    if (me + 1) % 5 == tg:        # 내가 생함 → 식상
        return "식신" if is_same_yinyang else "상관"
    if (me + 2) % 5 == tg:        # 내가 극함 → 재성
        return "편재" if is_same_yinyang else "정재"
    if (tg + 2) % 5 == me:        # 나를 극함 → 관성
        return "편관" if is_same_yinyang else "정관"
    if (tg + 1) % 5 == me:        # 나를 생함 → 인성
        return "편인" if is_same_yinyang else "정인"
    if me_e == tg_e:              # 같은 오행 → 비겁
        return "비견" if is_same_yinyang else "겁재"
    return "미정"

def five_elements_score(pillars_raw: Dict[str, Dict[str, Optional[str]]], day_stem_elem: str) -> Dict[str, Any]:
    score = {"wood":0.0,"fire":0.0,"earth":0.0,"metal":0.0,"water":0.0}
    for k in ["year","month","day","hour"]:
        p = pillars_raw.get(k) or {}
        s, b = p.get("stem"), p.get("branch")
        if s: score[STEM_ELEM[STEMS.index(s)]] += 1.0
        if b: score[BRANCH_ELEM[BRANCHES.index(b)]] += 0.7
    total = sum(score.values()) or 1.0
    percent = {k: round(v*100/total, 1) for k,v in score.items()}
    strength = "신강" if percent.get(day_stem_elem, 0) >= 28 else "신약"
    return {"score": score, "percent": percent, "strength": strength, "strengthScore": round(max(percent.values())/100, 2)}

def compute_pillars(date: str, time: Optional[str], _timezone: str, calendar: str) -> Tuple[Tuple[str,str], Tuple[str,str], Tuple[str,str], Tuple[Optional[str],Optional[str]]]:
    """연/월/일/시 간지 계산 (sajupy 사용) - timezone은 sajupy 내부에서 처리"""
    year, month, day = [int(x) for x in date.split("-")]

    if time:
        hh, mm = [int(x) for x in time.split(":")]
    else:
        hh, mm = 12, 0  # 시간 미입력 시 임시값(시주는 최종 None 처리)

    # 음력인 경우 양력으로 변환
    if calendar == "lunar":
        solar_result = lunar_to_solar(year, month, day)
        year = solar_result["solar_year"]
        month = solar_result["solar_month"]
        day = solar_result["solar_day"]

    # sajupy로 사주 계산 (태양시 보정 + 서울 기준)
    # early_zi_time=False: 00:00부터 당일로 계산 (야자시 방식)
    saju = calculate_saju(
        year=year,
        month=month,
        day=day,
        hour=hh,
        minute=mm,
        city="Seoul",
        use_solar_time=True,
        utc_offset=9,
        early_zi_time=False
    )

    ys, yb = saju['year_stem'], saju['year_branch']
    ms, mb = saju['month_stem'], saju['month_branch']
    ds, db = saju['day_stem'], saju['day_branch']
    ts, tb = (saju['hour_stem'], saju['hour_branch']) if time else (None, None)

    return (ys, yb), (ms, mb), (ds, db), (ts, tb)

def luck_direction(day_stem: str, gender: str) -> Dict[str, str]:
    """대운 방향(순행/역행)"""
    is_yang = day_stem in YANG_STEMS
    if (is_yang and gender == "male") or ((not is_yang) and gender == "female"):
        return {"direction": "순행", "rule": "양일간·남 / 음일간·여"}
    else:
        return {"direction": "역행", "rule": "양일간·여 / 음일간·남"}

# === (추가) 연애 지표 유틸 ===
def elem_percent_hanja(five: Dict[str, Any]) -> Dict[str, float]:
    """오행 퍼센트를 木火土金水 표기로 변환"""
    p = five.get("percent", {}) or {}
    return {ELEM_HANJA[k]: v for k, v in p.items()}

def detect_peach_blossom(pillars_raw: Dict[str, Dict[str, Optional[str]]]) -> Dict[str, Any]:
    """
    년지와 일지 기준 도화 표적지지와 실제 출현 위치(year/month/day/hour)
    - 년지 기준 도화: 년도 삼합에 따른 도화
    - 일지 기준 도화: 일주 삼합에 따른 도화
    둘 다 확인하여 도화살 존재 여부 판단
    """
    year_branch = (pillars_raw.get("year") or {}).get("branch")
    day_branch = (pillars_raw.get("day") or {}).get("branch")

    # 년지 기준 도화 타겟
    target_from_year = PEACH_MAP.get(year_branch) if year_branch else None
    # 일지 기준 도화 타겟
    target_from_day = PEACH_MAP.get(day_branch) if day_branch else None

    positions = []
    targets = set()

    # 년지 기준 도화 확인
    if target_from_year:
        targets.add(target_from_year)
        for k in ["year","month","day","hour"]:
            branch = (pillars_raw.get(k) or {}).get("branch")
            if branch == target_from_year and k not in positions:
                positions.append(k)

    # 일지 기준 도화 확인
    if target_from_day:
        targets.add(target_from_day)
        for k in ["year","month","day","hour"]:
            branch = (pillars_raw.get(k) or {}).get("branch")
            if branch == target_from_day and k not in positions:
                positions.append(k)

    # 타겟 지지들을 문자열로 변환
    target_branches = list(targets) if targets else None

    return {
        "targetBranch": target_branches[0] if target_branches and len(target_branches) == 1 else target_branches,
        "targetFromYear": target_from_year,
        "targetFromDay": target_from_day,
        "positions": positions,
        "hasPeach": bool(positions)
    }

def spouse_stars_presence(pillars: Dict[str, Dict[str, Any]], gender: str) -> Dict[str, Any]:
    """
    배우자 별 등장 여부 요약:
      - 남성: 재성(정재/편재)
      - 여성: 관성(정관/편관)
    각 주의 '천간 십성', '지지 주지장간 십성' 둘 다 체크
    """
    target_set = {"정재","편재"} if gender == "male" else {"정관","편관"}
    positions = []
    detail = {}
    count = 0
    for k in ["year","month","day","hour"]:
        tg_s = pillars[k].get("tenGodStem")
        tg_b = pillars[k].get("tenGodBranchMain")
        hit = []
        if tg_s in target_set: hit.append(("stem", tg_s))
        if tg_b in target_set: hit.append(("branchMain", tg_b))
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

# === 3) 메인 ===
def compute_all(name: Optional[str], gender: str, date: str, time: Optional[str], timezone: str, calendar: str, place: Optional[str]) -> Dict[str, Any]:
    (year_stem, year_branch), (month_stem, month_branch), (day_stem, day_branch), (hour_stem, hour_branch) = \
        compute_pillars(date, time, timezone, calendar)

    dm = stem_info(day_stem)

    raw = {
        "year":  {"stem": year_stem,  "branch": year_branch},
        "month": {"stem": month_stem, "branch": month_branch},
        "day":   {"stem": day_stem,   "branch": day_branch},
        "hour":  {"stem": hour_stem,  "branch": hour_branch},
    }

    out = {}
    for key in ["year","month","day","hour"]:
        s, b = raw[key]["stem"], raw[key]["branch"]
        s_part = stem_info(s) if s else None
        b_part = branch_info(b) if b else None
        tg_stem = ("일간" if key=="day" and s else (ten_god(day_stem, s) if s else None))
        tg_branch = ten_god(day_stem, b_part["mainHiddenStem"]) if b_part else None
        out[key] = {
            "stem": s_part,
            "branch": b_part,
            "tenGodStem": tg_stem,
            "tenGodBranchMain": tg_branch,
        }

    fe = five_elements_score(raw, day_stem_elem=dm["element"])
    luck = {"direction": luck_direction(day_stem, gender)["direction"]}

    # === (추가) 연애용 사실 신호 ===
    pillars_raw_chars = {
        k: {
            "stem": out[k]["stem"]["char"] if out[k]["stem"] else None,
            "branch": out[k]["branch"]["char"] if out[k]["branch"] else None,
        } for k in ["year","month","day","hour"]
    }
    peach = detect_peach_blossom(pillars_raw_chars)
    spouse = spouse_stars_presence(out, gender)
    fe_hanja = elem_percent_hanja(fe)
    hour_known = bool(time)

    loveFacts = {
        "hourKnown": hour_known,
        "peachBlossom": peach,
        "spouseStars": spouse,
        "fiveElementsHanjaPercent": fe_hanja,
        "dayMasterStrength": fe["strength"],
        "spouseTargetType": "재성" if gender == "male" else "관성"
    }

    return {
        "input": {"name": name, "gender": gender, "date": date, "time": time, "timezone": timezone, "calendar": calendar, "place": place},
        "dayMaster": dm,
        "pillars": out,
        "fiveElements": fe,
        "luck": luck,
        "loveFacts": loveFacts,
        "notice": "sajupy 라이브러리 사용. 태양시 보정 및 조자시 처리 적용."
    }
