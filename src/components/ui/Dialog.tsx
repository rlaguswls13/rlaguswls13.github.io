"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  readonly children: ReactNode;
  readonly dialogClassName: string;
  readonly isOpen: boolean;
  readonly labelledBy: string;
  readonly onClose: () => void;
  readonly overlayClassName: string;
};

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Dialog({ children, dialogClassName, isOpen, labelledBy, onClose, overlayClassName }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const overlay = overlayRef.current;
    if (!isOpen || !overlay || !dialog) return;

    const invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const outsideElements = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay,
    );
    const inertStates = outsideElements.map((element) => ({ element, wasInert: element.inert }));

    document.body.style.overflow = "hidden";
    for (const element of outsideElements) element.inert = true;

    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    const focusFirst = () => (getFocusable()[0] ?? dialog).focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      const first = focusable[0] ?? dialog;
      const last = focusable[focusable.length - 1] ?? dialog;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    focusFirst();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = previousOverflow;
      for (const { element, wasInert } of inertStates) element.inert = wasInert;
      if (invoker?.isConnected) invoker.focus();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const closeFromOverlay = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCloseRef.current();
  };

  return createPortal(
    <div ref={overlayRef} className={overlayClassName} data-dialog-overlay onClick={closeFromOverlay}>
      <div
        ref={dialogRef}
        className={dialogClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-dialog-content
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
