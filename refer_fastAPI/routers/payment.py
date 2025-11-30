# routers/payment.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, httpx, base64

router = APIRouter(prefix="/payment", tags=["payment"])

class ConfirmReq(BaseModel):
    paymentKey: str
    orderId: str
    amount: int

@router.post("/confirm")
async def confirm_payment(req: ConfirmReq):
    secret_key = os.getenv("TOSS_SECRET_KEY") 
    if not secret_key:
        raise HTTPException(500, "TOSS_SECRET_KEY not set")

    auth = base64.b64encode(f"{secret_key}:".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                "https://api.tosspayments.com/v1/payments/confirm",
                json=req.dict(),
                headers=headers,
                timeout=15,
            )
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=e.response.json()
            )

    return res.json()

