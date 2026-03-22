-- Ocho 어필리에이션 연동 테이블

-- 어필리에이트 (인플루언서)
CREATE TABLE ocho_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT 'sesaa2026',
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT,
  handle TEXT,
  followers INTEGER,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  credentials JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(external_id, campaign_id)
);

-- 무료 체험
CREATE TABLE ocho_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES ocho_affiliates(id),
  campaign_id TEXT NOT NULL DEFAULT 'sesaa2026',
  plan TEXT NOT NULL,
  duration_days INTEGER,
  usage_limit INTEGER,
  usage_used INTEGER NOT NULL DEFAULT 0,
  auto_convert BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  activation_type TEXT NOT NULL DEFAULT 'both',
  access_url TEXT,
  coupon_code TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 레퍼럴
CREATE TABLE ocho_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES ocho_affiliates(id),
  campaign_id TEXT NOT NULL DEFAULT 'sesaa2026',
  product_id TEXT NOT NULL DEFAULT 'all',
  platform TEXT NOT NULL,
  tracking_type TEXT NOT NULL DEFAULT 'both',
  code TEXT,
  links_by_platform JSONB DEFAULT '{}',
  commission_type TEXT NOT NULL,
  commission_value NUMERIC NOT NULL,
  discount_type TEXT,
  discount_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 레퍼럴 매출 통계
CREATE TABLE ocho_referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES ocho_referrals(id) UNIQUE,
  revenue NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 멱등성 로그
CREATE TABLE ocho_idempotency_log (
  request_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL DEFAULT 'sesaa2026',
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_ocho_affiliates_campaign ON ocho_affiliates(campaign_id);
CREATE INDEX idx_ocho_affiliates_external ON ocho_affiliates(external_id, campaign_id);
CREATE INDEX idx_ocho_trials_affiliate ON ocho_trials(affiliate_id);
CREATE INDEX idx_ocho_referrals_affiliate ON ocho_referrals(affiliate_id);
CREATE INDEX idx_ocho_idempotency_created ON ocho_idempotency_log(created_at);
