# routers/saju.py
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from services.saju_lunar import compute_all

router = APIRouter(prefix="/saju", tags=["saju"])


class SajuRequest(BaseModel):
    name: Optional[str] = None
    gender: Literal["male", "female"] = Field(..., description="남성 male | 여성 female")
    date: str = Field(..., description="YYYY-MM-DD (양력 기준; 음력 입력은 calendar='lunar')")
    time: Optional[str] = Field(None, description="HH:mm (없으면 null)")
    timezone: str = "Asia/Seoul"
    calendar: Literal["solar", "lunar"] = "solar"   # 음력 입력도 지원
    place: Optional[str] = None                     # 선택


@router.post("/compute")
def compute(req: SajuRequest) -> Dict[str, Any]:
    """
    사주 계산 API (lunar-python 기반)

    Returns:
        - input: 입력 정보
        - dayMaster: 일간 정보
        - pillars: 사주 팔자 (년/월/일/시주)
        - pillarsRaw: 사주 간지 원본
        - zodiac: 띠
        - fiveElements: 오행 분포 + 신강/신약 (560점 체계)
        - sinsal: 신살 20종 + _byPillar (주별 매핑) + _active
        - daeun: 대운 (방향, 시작시기, 목록)
        - luckCycles: 대운/연운/월운 상세 (십성, 12운성 포함)
        - tianShen, jiShen, xiongSha: 천신, 길신, 흉살
        - nobleDirection: 귀인 방위
        - jiuXing, xiu28, jianZhi: 구성, 28수, 건제12신
        - chong, gong, pengZu: 충살, 태원/명궁/신궁, 팽조백기
        - loveFacts: 연애 지표 (도화, 배우자별)
    """
    # 날짜 파싱
    year, month, day = [int(x) for x in req.date.split("-")]

    # 시간 파싱 (없으면 None)
    if req.time:
        hour, minute = [int(x) for x in req.time.split(":")]
    else:
        hour, minute = None, None

    # 음력/양력 여부
    is_lunar = req.calendar == "lunar"

    return compute_all(
        name=req.name,
        gender=req.gender,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        is_lunar=is_lunar,
        place=req.place,
    )
