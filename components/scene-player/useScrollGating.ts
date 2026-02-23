import { useState, useEffect, useRef, RefObject } from "react";

export function useScrollGating(
  active: boolean,
  deps: unknown[] = []
): {
  scrollRef: RefObject<HTMLDivElement | null>;
  canProceed: boolean;
  showScrollHint: boolean;
} {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canProceed, setCanProceed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    if (!active || !scrollRef.current) return;

    const el = scrollRef.current;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (scrollTop > 10) {
        setShowScrollHint(false);
      }

      if (isAtBottom) {
        setCanProceed(true);
      }
    };

    setCanProceed(false);
    setShowScrollHint(true);

    const checkTimer = setTimeout(() => {
      const needsScroll = el.scrollHeight > el.clientHeight + 50;

      if (!needsScroll) {
        setCanProceed(true);
        setShowScrollHint(false);
      } else {
        el.addEventListener("scroll", handleScroll);
        handleScroll();
      }
    }, 300);

    return () => {
      clearTimeout(checkTimer);
      el.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps]);

  return { scrollRef, canProceed, showScrollHint };
}
