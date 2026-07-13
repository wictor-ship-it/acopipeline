import { useEffect, useState } from "react";

/* Shared responsive breakpoint. Mirrors the 820px @media used across the CSS so
   screens whose layout is inline-styled (and can't be reached by a media query)
   can switch structure in React. Desktop (>820px) always returns false, so the
   pixel-perfect desktop layout is never touched. */
export function useIsMobile(maxWidth = 820): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return isMobile;
}
