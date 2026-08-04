"use client";

import { useState } from "react";
import { codePopupContent, CodePopupItem } from "@/content/detail/codePopupContent";
import { CodeIcon } from "@/components/ui/Icons";
import { Dialog } from "@/components/ui/Dialog";

interface CodePopupProps {
  name: string;
}

export function CodePopup({ name }: CodePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const data: CodePopupItem | undefined = codePopupContent[name];

  if (!data) {
    return <span className="font-mono font-bold text-[var(--accent-primary)]">{name}</span>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const codeLines = data.code.split("\n");

  return (
    <>
      {/* Clickable generic content badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-md font-mono text-sm font-bold bg-[var(--bg-tertiary)] text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 hover:shadow-[0_0_12px_var(--accent-glow-sm)] transition-all duration-300 cursor-pointer select-none"
        title={`${name} 코드 가이드 보기`}
      >
        <CodeIcon />
        <span>{name}</span>
        <svg
          className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      </button>

      {/* Modal Popup overlay */}
      {isOpen && (
        <Dialog
          isOpen
          labelledBy={`code-dialog-title-${name.replaceAll(".", "-")}`}
          onClose={() => setIsOpen(false)}
          overlayClassName="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          dialogClassName="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-[0_0_50px_var(--accent-glow-md)] rounded-2xl overflow-hidden transform scale-100 transition-all duration-300 animate-[zoomIn_0.2s_ease-out]"
        >
            <h2 id={`code-dialog-title-${name.replaceAll(".", "-")}`} className="sr-only">{data.title}</h2>
            
            {/* Absolute positioned close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-black text-[var(--text-secondary)] border border-[var(--border-color)] hover:scale-105 hover:rotate-90 transition-all duration-300 cursor-pointer shadow-lg"
              aria-label="닫기"
              data-dialog-close
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Body (Scrollable with pt-7 padding to compensate for no header) */}
            <div className="flex-1 overflow-y-auto p-6 pt-7 space-y-4 custom-scrollbar text-[14px] leading-relaxed">
              {/* Core Description section */}
              <div>
                <p className="text-[var(--text-primary)] bg-[var(--bg-primary)]/40 border border-[var(--border-color)] p-3.5 rounded-xl text-xs">
                  <span className="font-bold text-[var(--accent-secondary)] block mb-1">설명 및 역할</span>
                  {data.role}
                </p>
              </div>

              {/* Code window */}
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-t border-x border-[var(--border-color)] rounded-t-xl text-[11px] font-mono text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5 font-bold uppercase text-[var(--accent-secondary)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] inline-block animate-pulse"></span>
                    {data.language} Code Snippet
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-all select-none cursor-pointer text-[10px]"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h6m-6 4h6m-6 4h6" />
                        </svg>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Dynamic Theme-integrated Code block with Line Numbers */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-b-xl overflow-hidden max-h-[380px] flex flex-col">
                  <pre className="overflow-x-auto p-4 flex-1 text-xs font-mono text-[var(--text-primary)] leading-relaxed custom-scrollbar selection:bg-[var(--accent-primary)]/30 selection:text-white">
                    <code>
                      {codeLines.map((line, idx) => (
                        <div key={idx} className="flex hover:bg-[var(--bg-tertiary)]/75 px-2 rounded -mx-2 transition-colors">
                          <span className="w-7 text-right pr-3.5 text-[var(--text-secondary)] opacity-50 select-none font-medium text-[11px] pt-[2px]">
                            {idx + 1}
                          </span>
                          <span className="whitespace-pre">{line || " "}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Spring Config integration note */}
              {data.springNote && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-xs">
                    <span className="text-base">💡</span>
                    <span>Spring 아키텍처 연동 전략</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {data.springNote}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/30 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-black border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all duration-300 shadow-md cursor-pointer"
                data-dialog-close
              >
                닫기
              </button>
            </div>
        </Dialog>
      )}
    </>
  );
}
