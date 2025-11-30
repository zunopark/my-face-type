# routers/saju.py
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from services.saju_calc import compute_all

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
    return compute_all(
        name=req.name,
        gender=req.gender,
        date=req.date,
        time=req.time,
        timezone=req.timezone,
        calendar=req.calendar,
        place=req.place,
    )
