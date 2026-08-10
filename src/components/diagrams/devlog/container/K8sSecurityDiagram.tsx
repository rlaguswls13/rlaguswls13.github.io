"use client";
import React from "react";

/* ===== Inline style helpers using CSS Variables ===== */
const S = {
  heading: { color: 'var(--diagram-text-heading)' } as React.CSSProperties,
  text: { color: 'var(--diagram-text-primary)' } as React.CSSProperties,
  muted: { color: 'var(--diagram-text-muted)' } as React.CSSProperties,
  secondary: { color: 'var(--diagram-text-secondary)' } as React.CSSProperties,
  card: {
    background: 'var(--diagram-card-bg)',
    border: '1px solid var(--diagram-card-border)',
    boxShadow: 'var(--diagram-card-shadow)',
  } as React.CSSProperties,
};

const ACCENT = {
  blue: { color: '#3b82f6', light: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  emerald: { color: '#10b981', light: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  amber: { color: '#f59e0b', light: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  rose: { color: '#f43f5e', light: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.25)' },
  indigo: { color: '#6366f1', light: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
};

function SecFeature({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-wide mr-2 mb-2 shadow-sm"
      style={{ background: 'var(--diagram-badge-bg)', border: '1px solid var(--diagram-badge-border)', color: 'var(--diagram-text-primary)' }}>
      {text}
    </span>
  );
}

export function K8sSecurityDiagram() {
  return (
    <>
      <style>{`
        @keyframes scale-up-fade {
          from { opacity: 0; transform: scale(0.98) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-up { animation: scale-up-fade 0.5s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
      `}</style>

      <div className="w-full mt-6 mb-8 font-sans animate-scale-up opacity-0 delay-100">

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header section */}
          <div className="rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6" style={{ ...S.card, background: ACCENT.indigo.light }}>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight" style={{ color: ACCENT.indigo.color }}>
                Kubernetes 4C Security Model
              </h2>
              <p className="text-xs font-semibold leading-relaxed" style={S.secondary}>
                쿠버네티스 심층 방어(Defense in Depth) 원칙에 따른 다중 계층 보안 아키텍처.<br />
                외부 인프라부터 내부 애플리케이션 코드까지 4단계의 방어벽을 구성합니다.
              </p>
            </div>
          </div>

          {/* 4C Nested Layout */}
          <div className="p-6 md:p-8 rounded-3xl transition-all duration-300" style={{ background: ACCENT.blue.light, border: `2px dashed ${ACCENT.blue.border}` }}>
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
              <div>
                <h3 className="text-2xl font-black" style={{ color: ACCENT.blue.color }}>1. Cloud (클라우드 인프라)</h3>
                <p className="text-xs font-bold mt-1" style={S.secondary}>서버, 네트워크 등 물리적/가상화된 기반 인프라 보안</p>
              </div>
              <div className="flex flex-wrap max-w-xs">
                <SecFeature text="IAM / 접근 제어" />
                <SecFeature text="VPC 네트워크 격리" />
                <SecFeature text="KMS 암호화 연동" />
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-2xl mt-4 transition-all duration-300 animate-scale-up opacity-0 delay-200" style={{ background: ACCENT.emerald.light, border: `2px dashed ${ACCENT.emerald.border}` }}>
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-xl font-black" style={{ color: ACCENT.emerald.color }}>2. Cluster (오케스트레이션 클러스터)</h3>
                  <p className="text-xs font-bold mt-1" style={S.secondary}>API 서버, etcd, 노드 등 쿠버네티스 컨트롤 플레인 보안</p>
                </div>
                <div className="flex flex-wrap max-w-xs">
                  <SecFeature text="RBAC 인가" />
                  <SecFeature text="etcd 데이터 암호화" />
                  <SecFeature text="Admission Controller" />
                </div>
              </div>

              <div className="p-6 md:p-8 rounded-xl mt-4 transition-all duration-300 animate-scale-up opacity-0 delay-300" style={{ background: ACCENT.amber.light, border: `2px dashed ${ACCENT.amber.border}` }}>
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-black" style={{ color: ACCENT.amber.color }}>3. Container (워크로드)</h3>
                    <p className="text-xs font-bold mt-1" style={S.secondary}>파드(Pod) 내부의 컨테이너 런타임 및 이미지 보안</p>
                  </div>
                  <div className="flex flex-wrap max-w-xs">
                    <SecFeature text="Pod Security Standards" />
                    <SecFeature text="Network Policies" />
                    <SecFeature text="AppArmor / Seccomp" />
                  </div>
                </div>

                <div className="p-6 md:p-8 rounded-lg mt-4 transition-all duration-300 animate-scale-up opacity-0 delay-400 flex flex-col md:flex-row items-center justify-between" style={{ background: ACCENT.rose.light, border: `2px solid ${ACCENT.rose.border}` }}>
                  <div>
                    <h3 className="text-base font-black" style={{ color: ACCENT.rose.color }}>4. Code (애플리케이션 코드)</h3>
                    <p className="text-[11px] font-bold mt-1" style={S.secondary}>실제 동작하는 비즈니스 로직 및 라이브러리 보안</p>
                  </div>
                  <div className="flex flex-wrap justify-end mt-3 md:mt-0">
                    <SecFeature text="정적 코드 분석(SAST)" />
                    <SecFeature text="의존성 취약점 스캔" />
                    <SecFeature text="시큐어 코딩" />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
