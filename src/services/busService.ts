/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BusArrival,
  CTBETAResponse,
  GMBETAResponse,
  GMBETARouteSeqData,
  KMBETAResponse,
  MTRBETAResponse,
  StopInfo,
} from '../types';
import {
  GMB_N44B_FALLBACK_ROUTE_ID,
  GMB_ROUTE_ID_MAP,
  MTRB_STOP_TIME_OFFSETS_SEC,
  STOPS,
} from '../config/stops';

export { STOPS };

export interface ETAResult {
  arrivals: Record<string, BusArrival[]>;
  failedKeys: string[];
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 6000,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 6000,
  externalSignal?: AbortSignal
): Promise<T> {
  const res = await fetchWithTimeout(url, options, timeoutMs, externalSignal);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${url})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchETAForStops(
  stops: StopInfo[],
  signal?: AbortSignal
): Promise<ETAResult> {
  if (stops.length === 0 || signal?.aborted) {
    return { arrivals: {}, failedKeys: [] };
  }
  const now = new Date();
  const results: Record<string, BusArrival[]> = {};
  const failedKeys: string[] = [];

  // Group stops by operator
  const kmbStopIds = Array.from(new Set(stops.filter((s) => s.operator === 'KMB').map((s) => s.id)));
  const mtrbRoutes = Array.from(new Set(stops.filter((s) => s.operator === 'MTRB').map((s) => s.route)));
  const ctbStops = stops.filter((s) => s.operator === 'CTB');
  const gmbStops = stops.filter((s) => s.operator === 'GMB');

  // Fetch KMB data
  const kmbPromises = kmbStopIds.map(async (stopId) => {
    try {
      const data = await fetchJsonWithTimeout<KMBETAResponse>(
        `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`,
        {},
        6000,
        signal
      );
      return { stopId, ok: true, aborted: false, data: data.data || [] };
    } catch (error) {
      if (signal?.aborted) {
        return { stopId, ok: false, aborted: true, data: [] as KMBETAResponse['data'] };
      }
      console.error(`KMB API Error for stop ${stopId}:`, error);
      return { stopId, ok: false, aborted: false, data: [] as KMBETAResponse['data'] };
    }
  });

  // Fetch MTRB data
  const mtrbPromises = mtrbRoutes.map(async (route) => {
    try {
      const data = await fetchJsonWithTimeout<MTRBETAResponse>(
        'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routeName: route, language: 'zh' }),
        },
        6000,
        signal
      );
      return {
        route,
        ok: true,
        aborted: false,
        data: data.busStop || [],
        routeStatus: data.routeStatus || '0',
        routeStatusRemarkTitle: data.routeStatusRemarkTitle || '',
      };
    } catch (error) {
      if (signal?.aborted) {
        return {
          route,
          ok: false,
          aborted: true,
          data: [] as MTRBETAResponse['busStop'],
          routeStatus: '0',
          routeStatusRemarkTitle: '',
        };
      }
      console.error(`MTRB API Error for route ${route}:`, error);
      return {
        route,
        ok: false,
        aborted: false,
        data: [] as MTRBETAResponse['busStop'],
        routeStatus: '0',
        routeStatusRemarkTitle: '',
      };
    }
  });

  // Fetch CTB data
  const ctbPromises = ctbStops.map(async (stop) => {
    const key = `${stop.id}-${stop.route}`;
    try {
      const data = await fetchJsonWithTimeout<Partial<CTBETAResponse>>(
        `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stop.id}/${stop.route}`,
        {},
        6000,
        signal
      );
      return { key, ok: true, aborted: false, data: data.data || [] };
    } catch (error) {
      if (signal?.aborted) {
        return { key, ok: false, aborted: true, data: [] as CTBETAResponse['data'] };
      }
      console.error(`CTB API Error for ${stop.route}:`, error);
      return { key, ok: false, aborted: false, data: [] as CTBETAResponse['data'] };
    }
  });

  // Fetch GMB data
  const gmbPromises = gmbStops.map(async (stop) => {
    const key = `${stop.id}-${stop.route}`;
    try {
      const routeId = GMB_ROUTE_ID_MAP[stop.route] || stop.route;
      const data = await fetchJsonWithTimeout<Partial<GMBETAResponse>>(
        `https://data.etagmb.gov.hk/eta/route-stop/${routeId}/${stop.id}`,
        {},
        6000,
        signal
      );
      let stopData: GMBETARouteSeqData[] = data.data || [];

      // If 44B daytime has no active ETAs (e.g. night hours 23:00-06:30), check overnight N44B
      if (stop.route === '44B') {
        const targetSeq = stop.bound
          ? stopData.find((d) => d.route_seq === Number(stop.bound))
          : stopData[0];
        if (!targetSeq || !targetSeq.eta || targetSeq.eta.length === 0) {
          try {
            const n44bData = await fetchJsonWithTimeout<Partial<GMBETAResponse>>(
              `https://data.etagmb.gov.hk/eta/route-stop/${GMB_N44B_FALLBACK_ROUTE_ID}/${stop.id}`,
              {},
              3000,
              signal
            );
            if (n44bData.data && n44bData.data.length > 0) {
              stopData = n44bData.data;
            }
          } catch {
            // ignore fallback failure
          }
        }
      }

      return { key, ok: true, aborted: false, data: stopData };
    } catch (error) {
      if (signal?.aborted) {
        return { key, ok: false, aborted: true, data: [] as GMBETARouteSeqData[] };
      }
      console.error(`GMB API Error for ${stop.route}:`, error);
      return { key, ok: false, aborted: false, data: [] as GMBETARouteSeqData[] };
    }
  });

  const [kmbResults, mtrbResults, ctbResults, gmbResults] = await Promise.all([
    Promise.all(kmbPromises),
    Promise.all(mtrbPromises),
    Promise.all(ctbPromises),
    Promise.all(gmbPromises),
  ]);

  if (signal?.aborted) {
    return { arrivals: {}, failedKeys: [] };
  }

  // Map results back to individual stops
  stops.forEach((stop) => {
    const key = `${stop.id}-${stop.route}`;

    if (stop.operator === 'KMB') {
      const res = kmbResults.find((r) => r.stopId === stop.id);
      if (!res || res.aborted) return;
      if (!res.ok) {
        failedKeys.push(key);
        return;
      }

      const filtered = res.data
        .filter((item) => item.route === stop.route && (item.dir === stop.bound || !stop.bound))
        .sort((a, b) => {
          if (!a.eta) return 1;
          if (!b.eta) return -1;
          return new Date(a.eta).getTime() - new Date(b.eta).getTime();
        })
        .slice(0, 3);

      results[key] = filtered.map((item) => {
        const etaDate = item.eta ? new Date(item.eta) : null;
        const etaMs = etaDate && !Number.isNaN(etaDate.getTime()) ? etaDate.getTime() : undefined;
        const diff = etaMs !== undefined ? Math.floor((etaMs - now.getTime()) / 60000) : null;
        return {
          route: item.route,
          destination: item.dest_tc,
          eta: item.eta,
          etaTimestampMs: etaMs,
          remainingMinutes: diff !== null ? Math.max(0, diff) : null,
          remark: item.rmk_tc || '',
        };
      });
    } else if (stop.operator === 'MTRB') {
      const res = mtrbResults.find((r) => r.route === stop.route);
      if (!res || res.aborted) return;
      if (!res.ok) {
        failedKeys.push(key);
        return;
      }

      const stopIdToMatch = stop.id.split(',')[0];
      const stopData = res.data.find((s) => s.busStopId === stopIdToMatch);

      let destination = '未知目的地';
      if (stop.route === 'K51') destination = stop.bound === 'U' ? '大欖 (Tai Lam)' : '富泰 (Fu Tai)';
      else if (stop.route === 'K53') destination = stop.bound === 'U' ? '掃管笏 (So Kwun Wat)' : '屯門站 (Tuen Mun Station)';
      else if (stop.route === 'K51A') destination = stop.bound === 'U' ? '掃管笏 (So Kwun Wat)' : '富泰 (Fu Tai)';

      const isStopSuspended = stopData?.isSuspended === '1';
      const routeOutOfService = res.routeStatus !== '0' || Boolean(res.routeStatusRemarkTitle);

      if (isStopSuspended || !stopData || !stopData.bus || !Array.isArray(stopData.bus) || stopData.bus.length === 0) {
        const statusRemark = isStopSuspended
          ? (stopData?.busStopStatusRemarkTitle || '此站暫停服務')
          : (res.routeStatusRemarkTitle || (routeOutOfService ? '非服務時間' : ''));

        if (statusRemark) {
          results[key] = [{
            route: stop.route,
            destination,
            eta: null,
            remainingMinutes: null,
            remark: statusRemark,
            statusRemark,
          }];
        } else {
          results[key] = [];
        }
        return;
      }

      const manualOffsetSec = MTRB_STOP_TIME_OFFSETS_SEC[key] ?? 0;

      results[key] = stopData.bus.map((item) => {
        const rawSecStr = item.departureTimeInSecond || item.arrivalTimeInSecond;
        let rawSecs = rawSecStr ? parseInt(rawSecStr, 10) : NaN;
        if (!Number.isNaN(rawSecs) && rawSecs >= 86400 && item.arrivalTimeInSecond) {
          const arrSecs = parseInt(item.arrivalTimeInSecond, 10);
          if (!Number.isNaN(arrSecs) && arrSecs < 86400) {
            rawSecs = arrSecs;
          }
        }

        let offsetSecs = !Number.isNaN(rawSecs) && rawSecs < 86400 ? rawSecs : null;
        if (offsetSecs !== null && manualOffsetSec !== 0) {
          offsetSecs = Math.max(0, offsetSecs + manualOffsetSec);
        }

        const etaTimestampMs = offsetSecs !== null ? now.getTime() + offsetSecs * 1000 : undefined;
        const remainingMinutes = offsetSecs !== null ? Math.max(0, Math.floor(offsetSecs / 60)) : null;

        return {
          route: stop.route,
          destination,
          eta: item.departureTimeText || item.arrivalTimeText || '',
          etaTimestampMs,
          remainingMinutes,
          remark: item.busRemark || '',
          isScheduled: item.isScheduled === '1',
          isDelayed: item.isDelayed === '1',
          statusRemark: stopData.busStopStatusRemarkTitle || res.routeStatusRemarkTitle || undefined,
        };
      });
    } else if (stop.operator === 'CTB') {
      const res = ctbResults.find((r) => r.key === key);
      if (!res || res.aborted) return;
      if (!res.ok) {
        failedKeys.push(key);
        return;
      }

      const filtered = res.data.filter((item) => item.dir === stop.bound || !stop.bound);
      results[key] = filtered.map((item) => {
        const etaDate = item.eta ? new Date(item.eta) : null;
        const etaMs = etaDate && !Number.isNaN(etaDate.getTime()) ? etaDate.getTime() : undefined;
        const diff = etaMs !== undefined ? Math.floor((etaMs - now.getTime()) / 60000) : null;
        let dest = item.dest_tc;
        if (!dest && stop.route === 'B15') {
          dest = stop.bound === 'I' ? '皇崗口岸' : '青山灣';
        }
        return {
          route: item.route,
          destination: dest || '',
          eta: item.eta,
          etaTimestampMs: etaMs,
          remainingMinutes: diff !== null ? Math.max(0, diff) : null,
          remark: item.rmk_tc || '',
        };
      });
    } else if (stop.operator === 'GMB') {
      const res = gmbResults.find((r) => r.key === key);
      if (!res || res.aborted) return;
      if (!res.ok) {
        failedKeys.push(key);
        return;
      }

      const etas: { timestamp: string; remark: string }[] = [];
      const targetSeqData = stop.bound
        ? res.data.find((d) => d.route_seq === Number(stop.bound))
        : res.data[0];

      if (targetSeqData && targetSeqData.eta) {
        targetSeqData.eta.forEach((item) => {
          if (item.timestamp) {
            etas.push({ timestamp: item.timestamp, remark: item.remarks_tc || '' });
          }
        });
      }

      results[key] = etas.map((etaObj) => {
        const etaDate = new Date(etaObj.timestamp);
        const etaMs = !Number.isNaN(etaDate.getTime()) ? etaDate.getTime() : undefined;
        const diff = etaMs !== undefined ? Math.floor((etaMs - now.getTime()) / 60000) : null;
        let destination = '未知';
        if (stop.route === '140M') destination = '青衣站';
        else if (stop.route === '44B1') destination = stop.bound === '2' ? '皇崗口岸' : '屯門碼頭';
        else if (stop.route === '44B') destination = stop.bound === '2' ? '皇崗口岸' : '屯門站';
        return {
          route: stop.route,
          destination,
          eta: etaObj.timestamp,
          etaTimestampMs: etaMs,
          remainingMinutes: diff !== null ? Math.max(0, diff) : null,
          remark: etaObj.remark,
        };
      });
    }
  });

  return { arrivals: results, failedKeys };
}

export async function fetchAllETA(
  stops: StopInfo[],
  onPartialUpdate?: (partial: ETAResult) => void,
  signal?: AbortSignal
): Promise<ETAResult> {
  const pinnedStops = stops.filter((s) => s.category === 'pinned');
  const otherStops = stops.filter((s) => s.category !== 'pinned');

  // Fetch pinned ('往屯門') stops FIRST with top priority so they appear in ~300-500ms!
  if (onPartialUpdate && pinnedStops.length > 0 && otherStops.length > 0) {
    const pinnedPromise = fetchETAForStops(pinnedStops, signal).then((pinnedRes) => {
      if (!signal?.aborted) onPartialUpdate(pinnedRes);
      return pinnedRes;
    });

    const otherPromise = fetchETAForStops(otherStops, signal).then((otherRes) => {
      if (!signal?.aborted) onPartialUpdate(otherRes);
      return otherRes;
    });

    const [pinnedRes, otherRes] = await Promise.all([pinnedPromise, otherPromise]);
    return {
      arrivals: { ...pinnedRes.arrivals, ...otherRes.arrivals },
      failedKeys: [...pinnedRes.failedKeys, ...otherRes.failedKeys],
    };
  }

  return fetchETAForStops(stops, signal);
}
