import { useEffect, useRef, useState } from "react";
export default function CountUp({
  end,
  start = 0,
  duration = 1500,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  className = "",
}) {
  const [count, setCount] = useState(start);
  const fr = useRef(null);
  const sr = useRef(null);
  useEffect(() => {
    if (end === undefined || end === null) return;
    const e = parseFloat(end);
    if (isNaN(e)) return;
    cancelAnimationFrame(fr.current);
    sr.current = null;
    const animate = (ts) => {
      if (!sr.current) sr.current = ts;
      const p = Math.min((ts - sr.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(+start + (e - +start) * eased);
      if (p < 1) fr.current = requestAnimationFrame(animate);
      else setCount(e);
    };
    fr.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(fr.current);
  }, [end, start, duration]);
  const fmt = (() => {
    const n = Number(count).toFixed(decimals);
    const [i, d] = n.split(".");
    const ws = i.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decimals > 0 ? `${ws}.${d}` : ws;
  })();
  return (
    <span className={className}>
      {prefix}
      {fmt}
      {suffix}
    </span>
  );
}
