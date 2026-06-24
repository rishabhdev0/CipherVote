import { useState, useEffect, useCallback } from "react";
export function useCountdown(targetDate) {
  const calc = useCallback(() => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0)
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        ended: true,
        total: 0,
      };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      ended: false,
      total: diff,
    };
  }, [targetDate]);
  const [t, setT] = useState(calc);
  useEffect(() => {
    const timer = setInterval(() => {
      const r = calc();
      setT(r);
      if (r?.ended) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [calc]);
  return t;
}
