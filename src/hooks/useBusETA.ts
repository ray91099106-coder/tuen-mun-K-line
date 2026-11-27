/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STOPS } from '../config/stops';
import { ETAResult, fetchAllETA } from '../services/busService';
import { BusArrival, KeyStatus, SectionCategory } from '../types';

export const CACHE_KEY = 'cached_bus_arrivals_v2';
export const CACHE_TTL_MS = 3 * 60 * 1000; // 3 分鐘快取有效期

interface CachedBusPayload {
  timestamp: number;
  data: Record<string, BusArrival[]>;
  keyUpdatedAt?: Record<string, number>;
}

function loadValidCache(): CachedBusPayload | null {
  try {
    localStorage.removeItem('cached_bus_arrivals'); // 清除舊版無 TTL 快取
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBusPayload;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    const nowMs = Date.now();
    if (nowMs - parsed.timestamp > CACHE_TTL_MS) return null;

    const validData: Record<string, BusArrival[]> = {};
    const validKeyUpdatedAt: Record<string, number> = {};
    for (const [k, list] of Object.entries(parsed.data || {})) {
      const updated = parsed.keyUpdatedAt?.[k] ?? parsed.timestamp;
      if (nowMs - updated <= CACHE_TTL_MS) {
        validData[k] = list;
        validKeyUpdatedAt[k] = updated;
      }
    }
    if (Object.keys(validData).length === 0) return null;
    return {
      timestamp: parsed.timestamp,
      data: validData,
      keyUpdatedAt: validKeyUpdatedAt,
    };
  } catch {
    return null;
  }
}

export interface UseBusETAParams {
  activeCategory: SectionCategory;
  activeTimerRoute: string | null;
  activeKowloonTimerRoute: string | null;
}

export function useBusETA({
  activeCategory,
  activeTimerRoute,
  activeKowloonTimerRoute,
}: UseBusETAParams) {
  const initialCache = useMemo(() => loadValidCache(), []);

  const [arrivals, setArrivals] = useState<Record<string, BusArrival[]>>(() => initialCache?.data || {});
  const [keyUpdatedAt, setKeyUpdatedAt] = useState<Record<string, number>>(() => {
    if (!initialCache) return {};
    if (initialCache.keyUpdatedAt) return initialCache.keyUpdatedAt;
    const fallback: Record<string, number> = {};
    Object.keys(initialCache.data || {}).forEach((k) => {
      fallback[k] = initialCache.timestamp;
    });
    return fallback;
  });
  const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [pinnedLoading, setPinnedLoading] = useState<boolean>(() => {
    if (!initialCache?.data) return true;
    return !Object.keys(initialCache.data).some((k) => k.includes('K51') || k.includes('61M'));
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const arrivalsRef = useRef(arrivals);
  const keyUpdatedAtRef = useRef(keyUpdatedAt);

  useEffect(() => {
    arrivalsRef.current = arrivals;
  }, [arrivals]);

  useEffect(() => {
    keyUpdatedAtRef.current = keyUpdatedAt;
  }, [keyUpdatedAt]);

  // 智慧輪詢清單：目前展開區塊 + 正在進行倒數的計時器所屬區塊
  const pollingCategories = useMemo<SectionCategory[]>(() => {
    const set = new Set<SectionCategory>([activeCategory]);
    if (activeTimerRoute !== null) set.add('pinned');
    if (activeKowloonTimerRoute !== null) set.add('kowloon');
    return Array.from(set);
  }, [activeCategory, activeTimerRoute, activeKowloonTimerRoute]);

  const pollingCategoriesKey = pollingCategories.join(',');

  const applyEtaResult = useCallback((res: ETAResult) => {
    const nowMs = Date.now();
    const failedSet = new Set(res.failedKeys);

    const nextArrivals = { ...arrivalsRef.current };
    const nextKeyUpdatedAt = { ...keyUpdatedAtRef.current };

    for (const [key, list] of Object.entries(res.arrivals)) {
      if (!failedSet.has(key)) {
        nextArrivals[key] = list;
        nextKeyUpdatedAt[key] = nowMs;
      }
    }

    arrivalsRef.current = nextArrivals;
    keyUpdatedAtRef.current = nextKeyUpdatedAt;
    setArrivals(nextArrivals);
    setKeyUpdatedAt(nextKeyUpdatedAt);

    setFailedKeys((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(res.arrivals)) {
        if (!failedSet.has(key)) {
          delete next[key];
        }
      }
      for (const key of res.failedKeys) {
        next[key] = true;
      }
      return next;
    });

    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: nowMs,
          data: nextArrivals,
          keyUpdatedAt: nextKeyUpdatedAt,
        } satisfies CachedBusPayload)
      );
    } catch {
      // ignore storage quota errors
    }

    if (Object.keys(res.arrivals).some((k) => k.includes('K51') || k.includes('61M') || k.includes('52X'))) {
      setPinnedLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    // 競態保護：取消尚未完成的舊請求並遞增請求序號
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const reqId = ++requestSeqRef.current;

    const targetCategories = pollingCategoriesKey.split(',').filter(Boolean) as SectionCategory[];
    const targetStops = STOPS.filter(
      (s) => s.category && targetCategories.includes(s.category as SectionCategory)
    );

    if (targetStops.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const finalRes = await fetchAllETA(
        targetStops,
        (partialRes) => {
          if (reqId !== requestSeqRef.current || controller.signal.aborted) return;
          applyEtaResult(partialRes);
        },
        controller.signal
      );

      if (reqId !== requestSeqRef.current || controller.signal.aborted) return;

      applyEtaResult(finalRes);
      setLastUpdated(new Date());

      if (finalRes.failedKeys.length === targetStops.length && targetStops.length > 0) {
        setError('暫時未能連線至巴士伺服器，若近期有快取將暫時保留顯示。');
      }
    } catch {
      if (reqId !== requestSeqRef.current || controller.signal.aborted) return;
      setError('無法獲取到站時間，請稍後再試。');
    } finally {
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setLoading(false);
        if (targetCategories.includes('pinned')) {
          setPinnedLoading(false);
        }
      }
    }
  }, [pollingCategoriesKey, applyEtaResult]);

  useEffect(() => {
    refreshAll();

    let interval: ReturnType<typeof setInterval> | undefined;

    const startTimer = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshAll();
        }
      }, 30000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAll();
        startTimer();
      } else if (interval) {
        clearInterval(interval);
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refreshAll]);

  const getKeyStatus = useCallback(
    (key: string): KeyStatus => {
      if (!failedKeys[key]) return 'ok';
      const lastOk = keyUpdatedAt[key];
      if (lastOk && Date.now() - lastOk <= CACHE_TTL_MS) {
        return 'delayed';
      }
      return 'error';
    },
    [failedKeys, keyUpdatedAt]
  );

  return {
    arrivals,
    failedKeys,
    loading,
    pinnedLoading,
    lastUpdated,
    error,
    refreshAll,
    getKeyStatus,
  };
}
