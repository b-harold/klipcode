"use client";

import { useEffect, useState } from "react";

interface AccountToastProps {
  message?: string;
}

export function AccountToast({ message }: AccountToastProps) {
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Snap visibleMessage to the latest non-empty `message` during render
  // (documented "adjust state when a prop changes" pattern), so the effect
  // body below stays free of synchronous setState calls.
  const [prevMessage, setPrevMessage] = useState(message);
  if (message !== prevMessage) {
    setPrevMessage(message);
    if (message) {
      setVisibleMessage(message);
      setIsVisible(false);
    }
  }

  useEffect(() => {
    if (!visibleMessage) return;
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    const hideTimer = setTimeout(() => setIsVisible(false), 3000);
    const removeTimer = setTimeout(() => setVisibleMessage(null), 3300);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [visibleMessage]);

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
      {visibleMessage && (
        <div
          aria-live="polite"
          className={`pointer-events-auto max-w-xs rounded-md px-3 py-1 text-[11px] transition-opacity duration-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {visibleMessage}
        </div>
      )}
    </div>
  );
}
