import { useState, useEffect } from "react";
export function useDebounce(v, delay = 400) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  return d;
}
