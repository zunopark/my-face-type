"use client";

import { useState, useEffect, useCallback } from "react";

interface OchoStatusData {
  service: string;
  campaign_id: string;
  keys: {
    partner_api_key: string;
    shared_secret: string;
  };
  status: {
    partner_api_key: string;
    shared_secret: string;
  };
  endpoints: {
    method: string;
    path: string;
    description: string;
  }[];
}

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "rgba(34, 197, 94, 0.12)", text: "#4ade80", border: "rgba(34, 197, 94, 0.3)" },
  POST: { bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  PATCH: { bg: "rgba(234, 179, 8, 0.12)", text: "#facc15", border: "rgba(234, 179, 8, 0.3)" },
  DELETE: { bg: "rgba(239, 68, 68, 0.12)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
};

function isConfigured(statusStr: string): boolean {
  return statusStr.startsWith("✅");
}

export default function OchoStatusPage() {
  const [data, setData] = useState<OchoStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSpinning(true);
    try {
      const res = await fetch("/api/ocho/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const s = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0d1117 0%, #0f1923 50%, #0d1117 100%)",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#c9d1d9",
      padding: "40px 24px 80px",
    } as React.CSSProperties,

    inner: {
      maxWidth: 860,
      margin: "0 auto",
    } as React.CSSProperties,

    // Header
    headerRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap" as const,
      marginBottom: 36,
    } as React.CSSProperties,

    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(99, 102, 241, 0.15)",
      border: "1px solid rgba(99, 102, 241, 0.35)",
      borderRadius: 6,
      padding: "3px 10px",
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      color: "#a5b4fc",
      letterSpacing: "0.05em",
      textTransform: "uppercase" as const,
      marginBottom: 10,
    } as React.CSSProperties,

    serviceName: {
      fontSize: "clamp(20px, 4vw, 28px)",
      fontWeight: 700,
      color: "#f0f6fc",
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "-0.02em",
      margin: 0,
      lineHeight: 1.2,
    } as React.CSSProperties,

    campaignBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      background: "rgba(16, 185, 129, 0.1)",
      border: "1px solid rgba(16, 185, 129, 0.25)",
      borderRadius: 6,
      padding: "4px 12px",
      fontSize: 12,
      color: "#34d399",
      fontFamily: "'DM Mono', monospace",
    } as React.CSSProperties,

    refreshBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 18px",
      color: "#8b949e",
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "'DM Mono', monospace",
      transition: "all 0.2s",
      flexShrink: 0,
      alignSelf: "flex-start",
    } as React.CSSProperties,

    // Section title
    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      color: "#484f58",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      marginBottom: 12,
      marginTop: 36,
      fontFamily: "'DM Mono', monospace",
    } as React.CSSProperties,

    // Key cards grid
    keysGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    keyCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "20px 22px",
      position: "relative" as const,
      overflow: "hidden",
    } as React.CSSProperties,

    keyCardAccent: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: 60,
      height: 60,
      borderRadius: "0 12px 0 60px",
      background: "rgba(99, 102, 241, 0.06)",
    } as React.CSSProperties,

    keyLabel: {
      fontSize: 11,
      color: "#484f58",
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      marginBottom: 10,
      fontFamily: "'DM Mono', monospace",
    } as React.CSSProperties,

    keyValueRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,

    keyValue: {
      fontSize: 13,
      color: "#e6edf3",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 6,
      padding: "5px 10px",
      letterSpacing: "0.05em",
    } as React.CSSProperties,

    dotGreen: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#22c55e",
      boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
      flexShrink: 0,
    } as React.CSSProperties,

    dotRed: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#ef4444",
      boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
      flexShrink: 0,
    } as React.CSSProperties,

    statusText: {
      fontSize: 12,
      fontFamily: "'DM Mono', monospace",
    } as React.CSSProperties,

    // Endpoints table
    endpointsCard: {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      overflow: "hidden",
    } as React.CSSProperties,

    endpointRow: {
      display: "grid",
      gridTemplateColumns: "72px 1fr auto",
      alignItems: "center",
      gap: 16,
      padding: "14px 22px",
      transition: "background 0.15s",
    } as React.CSSProperties,

    endpointRowHover: {
      background: "rgba(255,255,255,0.035)",
    } as React.CSSProperties,

    endpointDivider: {
      height: 1,
      background: "rgba(255,255,255,0.04)",
      margin: "0 22px",
    } as React.CSSProperties,

    endpointPath: {
      fontSize: 13,
      color: "#c9d1d9",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      letterSpacing: "-0.01em",
      wordBreak: "break-all" as const,
    } as React.CSSProperties,

    endpointDesc: {
      fontSize: 12,
      color: "#484f58",
      fontFamily: "'DM Mono', monospace",
      textAlign: "right" as const,
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,

    // Loading / Error states
    stateBox: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px",
      gap: 16,
      textAlign: "center" as const,
    } as React.CSSProperties,

    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#6366f1",
      display: "inline-block",
    } as React.CSSProperties,

    errorCard: {
      background: "rgba(239, 68, 68, 0.08)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
      borderRadius: 12,
      padding: "24px 28px",
      color: "#f87171",
      fontFamily: "'DM Mono', monospace",
      fontSize: 14,
      textAlign: "center" as const,
    } as React.CSSProperties,

    timestamp: {
      fontSize: 11,
      color: "#30363d",
      fontFamily: "'DM Mono', monospace",
      marginTop: 32,
      textAlign: "center" as const,
    } as React.CSSProperties,
  };

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [btnHover, setBtnHover] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse3 {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ocho-fadeup { animation: fadeUp 0.45s ease both; }
        .ocho-fadeup-1 { animation-delay: 0.05s; }
        .ocho-fadeup-2 { animation-delay: 0.12s; }
        .ocho-fadeup-3 { animation-delay: 0.2s; }
        .ocho-dot-pulse {
          animation: pulse3 1.4s ease-in-out infinite;
        }
        .ocho-dot-pulse:nth-child(2) { animation-delay: 0.2s; }
        .ocho-dot-pulse:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div style={s.page}>
        <div style={s.inner}>

          {/* Header */}
          <div style={s.headerRow} className="ocho-fadeup">
            <div>
              <div style={s.badge}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc", display: "inline-block" }} />
                API Status
              </div>
              <h1 style={s.serviceName}>
                {data?.service ?? "Ocho Affiliation API"}
              </h1>
              {data && (
                <div style={s.campaignBadge}>
                  <span style={{ opacity: 0.6, fontSize: 10 }}>CAMPAIGN</span>
                  <span style={{ fontWeight: 600 }}>{data.campaign_id}</span>
                </div>
              )}
            </div>

            <button
              style={{
                ...s.refreshBtn,
                ...(btnHover ? { background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.18)", color: "#c9d1d9" } : {}),
              }}
              onClick={fetchStatus}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              disabled={loading}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={spinning ? { animation: "spin 0.6s linear" } : {}}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              새로고침
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={s.stateBox}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="ocho-dot-pulse"
                    style={{ ...s.loadingDot, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, color: "#484f58", fontFamily: "'DM Mono', monospace" }}>
                상태 조회 중...
              </span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div style={s.errorCard}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div>API 호출 실패: {error}</div>
              <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
                /api/ocho/status 엔드포인트를 확인하세요
              </div>
            </div>
          )}

          {/* Main content */}
          {!loading && data && (
            <>
              {/* Keys section */}
              <div className="ocho-fadeup ocho-fadeup-1">
                <div style={s.sectionTitle}>API Keys</div>
                <div style={s.keysGrid}>
                  {(
                    [
                      { label: "Partner API Key", keyName: "partner_api_key" as const },
                      { label: "Shared Secret", keyName: "shared_secret" as const },
                    ] as const
                  ).map(({ label, keyName }) => {
                    const configured = isConfigured(data.status[keyName]);
                    const keyVal = data.keys[keyName];
                    return (
                      <div key={keyName} style={s.keyCard}>
                        <div style={s.keyCardAccent} />
                        <div style={s.keyLabel}>{label}</div>
                        <div style={s.keyValueRow}>
                          <div style={configured ? s.dotGreen : s.dotRed} />
                          <div style={{
                            ...s.keyValue,
                            color: configured ? "#e6edf3" : "#6e7681",
                          }}>
                            {keyVal}
                          </div>
                        </div>
                        <div style={{
                          ...s.statusText,
                          color: configured ? "#22c55e" : "#ef4444",
                          marginTop: 10,
                        }}>
                          {data.status[keyName]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Endpoints section */}
              <div className="ocho-fadeup ocho-fadeup-2">
                <div style={s.sectionTitle}>Endpoints ({data.endpoints.length})</div>
                <div style={s.endpointsCard}>
                  {data.endpoints.map((ep, idx) => {
                    const mc = METHOD_COLORS[ep.method] ?? METHOD_COLORS.POST;
                    return (
                      <div key={idx}>
                        <div
                          style={{
                            ...s.endpointRow,
                            ...(hoveredRow === idx ? s.endpointRowHover : {}),
                          }}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          {/* Method badge */}
                          <div style={{
                            background: mc.bg,
                            border: `1px solid ${mc.border}`,
                            color: mc.text,
                            borderRadius: 6,
                            padding: "3px 0",
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "0.08em",
                          }}>
                            {ep.method}
                          </div>

                          {/* Path */}
                          <div style={s.endpointPath}>
                            {ep.path}
                          </div>

                          {/* Description */}
                          <div style={s.endpointDesc}>
                            {ep.description}
                          </div>
                        </div>
                        {idx < data.endpoints.length - 1 && (
                          <div style={s.endpointDivider} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall health summary */}
              <div className="ocho-fadeup ocho-fadeup-3">
                <div style={s.sectionTitle}>Overall Health</div>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap" as const,
                }}>
                  {(() => {
                    const allOk = isConfigured(data.status.partner_api_key) && isConfigured(data.status.shared_secret);
                    const partialOk = isConfigured(data.status.partner_api_key) || isConfigured(data.status.shared_secret);
                    const color = allOk ? "#22c55e" : partialOk ? "#facc15" : "#ef4444";
                    const glow = allOk ? "rgba(34,197,94,0.6)" : partialOk ? "rgba(250,204,21,0.6)" : "rgba(239,68,68,0.6)";
                    const label = allOk ? "완전 설정됨" : partialOk ? "부분 설정됨" : "설정 필요";
                    const desc = allOk
                      ? "모든 API 키가 정상적으로 설정되어 있습니다."
                      : partialOk
                      ? "일부 키가 누락되어 있습니다. Ocho에서 나머지 키를 받아 설정하세요."
                      : "API 키가 설정되지 않았습니다. Ocho 연동을 위해 키 설정이 필요합니다.";
                    return (
                      <>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: color,
                          boxShadow: `0 0 8px ${glow}`,
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 14, color, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 12, color: "#484f58", fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
                            {desc}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* Last updated */}
          {lastUpdated && (
            <div style={s.timestamp}>
              마지막 업데이트: {lastUpdated.toLocaleTimeString("ko-KR")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
