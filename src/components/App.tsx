"use client";

import { useCallback, useEffect, useState } from "react";

import { DOMAINS, pickRandomQuestions, type Domain, type Question } from "@/data";
import {
  getProgressStore,
  recordScore,
  type Progress,
} from "@/lib/storage";

import { HomeView } from "./HomeView";
import { SessionView } from "./SessionView";

export interface SessionEntry {
  domain: Domain;
  question: Question;
}

export interface SessionSpec {
  title: string;
  entries: SessionEntry[];
}

/** 抜き打ち検査で出題する問題数 */
export const SPOT_CHECK_COUNT = 8;

export function App() {
  const [progress, setProgress] = useState<Progress>({});
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<SessionSpec | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProgressStore()
      .load()
      .then((stored) => {
        if (!cancelled) {
          setProgress(stored);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScore = useCallback(
    (domainId: string, questionId: string, score: number) => {
      setProgress((current) => {
        const next = recordScore(current, domainId, questionId, score);
        // 保存に失敗しても演習は続行できる（ストレージ層が握りつぶす）
        void getProgressStore().save(next);
        return next;
      });
    },
    []
  );

  const startDomain = useCallback((domain: Domain) => {
    setSession({
      title: domain.name,
      entries: domain.questions.map((question) => ({ domain, question })),
    });
  }, []);

  const startSpotCheck = useCallback(() => {
    setSession({
      title: `抜き打ち検査（全分野から${SPOT_CHECK_COUNT}問）`,
      entries: pickRandomQuestions(SPOT_CHECK_COUNT),
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({});
    void getProgressStore().clear();
  }, []);

  if (session) {
    return (
      <SessionView
        session={session}
        onScore={handleScore}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <HomeView
      domains={DOMAINS}
      progress={progress}
      loaded={loaded}
      onStartDomain={startDomain}
      onStartSpotCheck={startSpotCheck}
      onReset={resetProgress}
    />
  );
}
