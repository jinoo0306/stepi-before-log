"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/tabs";
import { StartTaskForm } from "@/components/start-task-form";
import { InProgressList } from "@/components/in-progress-list";
import { CompletedList } from "@/components/completed-list";
import { api } from "@/lib/api";
import type { Handler } from "@/lib/types";

type TabValue = "start" | "in_progress" | "completed";

export default function Page() {
  const [tab, setTab] = useState<TabValue>("start");
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);

  const loadHandlers = useCallback(async () => {
    try {
      const data = await api.listHandlers();
      setHandlers(data);
      setBootError(null);
    } catch (e) {
      setBootError(
        e instanceof Error
          ? e.message
          : "담당자 목록을 불러오지 못했습니다. 백엔드가 실행 중인지 확인하세요."
      );
    }
  }, []);

  useEffect(() => {
    loadHandlers();
  }, [loadHandlers]);

  const onStarted = () => {
    setRefreshKey((k) => k + 1);
    setTab("in_progress");
  };

  const onChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-600" aria-hidden />
            <p className="text-xs font-semibold tracking-wider text-accent-700">
              STEPI
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">
            채용 작업 로그
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            수험번호별로 업무 시간을 기록하고 관리합니다.
          </p>
        </div>
        <Link href="/table" className="btn-secondary shrink-0">
          <Database size={14} />
          <span className="hidden sm:inline">데이터 워크벤치</span>
          <span className="sm:hidden">DB</span>
        </Link>
      </header>

      {bootError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {bootError}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="start">업무 시작</TabsTrigger>
          <TabsTrigger value="in_progress">진행중</TabsTrigger>
          <TabsTrigger value="completed">완료 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="start">
          <StartTaskForm
            handlers={handlers}
            onHandlersChange={loadHandlers}
            onStarted={onStarted}
          />
        </TabsContent>

        <TabsContent value="in_progress">
          <InProgressList refreshKey={refreshKey} onChanged={onChanged} />
        </TabsContent>

        <TabsContent value="completed">
          <CompletedList refreshKey={refreshKey} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
