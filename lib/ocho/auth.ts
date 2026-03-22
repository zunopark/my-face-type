import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const OCHO_PARTNER_API_KEY = process.env.OCHO_PARTNER_API_KEY || "";
const OCHO_SHARED_SECRET = process.env.OCHO_SHARED_SECRET || "";
const OCHO_CAMPAIGN_ID = process.env.OCHO_CAMPAIGN_ID || "sesaa2026";

export interface OchoAuthContext {
  campaignId: string;
  requestId: string;
  isTestMode: boolean;
}

/**
 * Ocho 요청 인증 검증
 * - Bearer 토큰 확인
 * - HMAC-SHA256 서명 검증
 * - 멱등성 키 추출
 */
export async function verifyOchoRequest(
  request: NextRequest,
  rawBody?: string
): Promise<{ ok: true; context: OchoAuthContext } | { ok: false; error: NextResponse }> {
  // 1. Bearer 토큰 확인
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "unauthorized", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== OCHO_PARTNER_API_KEY) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "unauthorized", message: "Invalid API key" } },
        { status: 401 }
      ),
    };
  }

  // 2. HMAC 서명 검증
  const signature = request.headers.get("x-ocho-signature");
  if (!signature) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "signature_invalid", message: "Missing X-Ocho-Signature header" } },
        { status: 401 }
      ),
    };
  }

  let signingInput: string;
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const path = url.pathname;
    const query = url.search ? url.search.slice(1) : "";
    signingInput = `${method}\n${path}\n${query}`;
  } else {
    signingInput = rawBody || "";
  }

  const expectedSignature = crypto
    .createHmac("sha256", OCHO_SHARED_SECRET)
    .update(signingInput)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "signature_invalid", message: "HMAC signature verification failed" } },
        { status: 401 }
      ),
    };
  }

  // 3. Request ID (멱등성)
  const requestId = request.headers.get("x-ocho-request-id");
  if (!requestId) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "invalid_request", message: "Missing X-Ocho-Request-Id header" } },
        { status: 400 }
      ),
    };
  }

  // 4. 테스트 모드
  const isTestMode = request.headers.get("x-ocho-test-mode") === "true";

  return {
    ok: true,
    context: {
      campaignId: OCHO_CAMPAIGN_ID,
      requestId,
      isTestMode,
    },
  };
}
