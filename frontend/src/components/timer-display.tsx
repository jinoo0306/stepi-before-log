"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

export function LiveTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const startMs = new Date(startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  return (
    <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
      {formatDuration(elapsed)}
    </span>
  );
}
