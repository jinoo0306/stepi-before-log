"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

// 일시정지를 반영한 경과 시간(초).
// 진행중 + 일시정지 아님 → now - started - 누적
// 진행중 + 일시정지 중   → paused_at - started - 누적 (멈춰 있음)
function computeElapsed(
  nowMs: number,
  startedAt: string,
  pausedAt: string | null,
  totalPausedSeconds: number
): number {
  const startMs = new Date(startedAt).getTime();
  const refMs = pausedAt ? new Date(pausedAt).getTime() : nowMs;
  return Math.max(0, Math.floor((refMs - startMs) / 1000) - totalPausedSeconds);
}

export function LiveTimer({
  startedAt,
  pausedAt = null,
  totalPausedSeconds = 0,
}: {
  startedAt: string;
  pausedAt?: string | null;
  totalPausedSeconds?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (pausedAt) return; // 일시정지 중엔 tick 불필요
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pausedAt]);

  const elapsed = computeElapsed(now, startedAt, pausedAt, totalPausedSeconds);

  return (
    <span
      className={`font-mono tabular-nums text-2xl font-semibold ${
        pausedAt ? "text-slate-400" : "text-slate-900"
      }`}
    >
      {formatDuration(elapsed)}
    </span>
  );
}
