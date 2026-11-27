/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, KeyStatus, RouteTimerTrigger, StopInfo } from '../../types';
import { PINNED_KMB_ROUTES, PINNED_MTRB_ROUTES, PINNED_TARGET_ROUTES } from '../../config/stops';
import { DepartureTimer } from '../DepartureTimer';
import { RefreshControl } from './RefreshControl';
import {
  formatEtaClock,
  getPinnedStyles,
  NextBusStrip,
  renderArrivalMetaBadges,
  renderKeyStatusBadge,
} from './sectionHelpers';

interface PinnedSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  stops: StopInfo[];
  arrivals: Record<string, BusArrival[]>;
  loading: boolean;
  pinnedLoading: boolean;
  lastUpdated: Date;
  onRefresh: () => void | Promise<void>;
  getKeyStatus: (key: string) => KeyStatus;
  activeTimerRoute: string | null;
  onActiveTimerRouteChange: (route: string | null) => void;
  leadMinutes: number;
  onLeadMinutesChange: (mins: number) => void;
  timerTrigger: RouteTimerTrigger | null;
  onTriggerRouteTimer: (route: string, clickedArrivalMinutes?: number | null, clickedEtaTimestampMs?: number) => void;
}

export const PinnedSection: React.FC<PinnedSectionProps> = React.memo(({
  isOpen,
  onToggle,
  stops,
  arrivals,
  loading,
  pinnedLoading,
  lastUpdated,
  onRefresh,
  getKeyStatus,
  activeTimerRoute,
  onActiveTimerRouteChange,
  leadMinutes,
  onLeadMinutesChange,
  timerTrigger,
  onTriggerRouteTimer,
}) => {
  const earliestPinnedArrival = useMemo(() => {
    let best: { route: string; minutes: number; etaTimestampMs?: number; isNextBus: boolean } | null = null;

    for (const route of PINNED_TARGET_ROUTES) {
      const stop = stops.find((s) => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter((a) => a.route === route) || [];
      if (routeArrivals.length === 0) continue;

      const first = routeArrivals[0];
      const catchable = routeArrivals.find((a) => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNextBus = catchable !== first;
        if (!best || catchable.remainingMinutes < best.minutes) {
          best = {
            route,
            minutes: catchable.remainingMinutes,
            etaTimestampMs: catchable.etaTimestampMs,
            isNextBus,
          };
        }
      }
    }

    if (!best) {
      for (const route of PINNED_TARGET_ROUTES) {
        const stop = stops.find((s) => s.route === route);
        if (!stop) continue;
        const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter((a) => a.route === route) || [];
        const first = routeArrivals[0];
        if (first && first.remainingMinutes !== null && first.remainingMinutes >= 0) {
          if (!best || first.remainingMinutes < best.minutes) {
            best = {
              route,
              minutes: first.remainingMinutes,
              etaTimestampMs: first.etaTimestampMs,
              isNextBus: false,
            };
          }
        }
      }
    }

    return best;
  }, [arrivals, stops, leadMinutes]);

  const allPinnedRouteArrivals = useMemo(() => {
    const list: {
      route: string;
      minutes: number | null;
      etaTimestampMs?: number;
      firstMinutes?: number | null;
      firstEtaTimestampMs?: number;
      isNextBus?: boolean;
    }[] = [];

    for (const route of PINNED_TARGET_ROUTES) {
      const stop = stops.find((s) => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter((a) => a.route === route) || [];
      if (routeArrivals.length === 0) {
        list.push({ route, minutes: null });
        continue;
      }

      const first = routeArrivals[0];
      const catchable = routeArrivals.find((a) => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNext = catchable !== first;
        list.push({
          route,
          minutes: catchable.remainingMinutes,
          etaTimestampMs: catchable.etaTimestampMs,
          firstMinutes: first?.remainingMinutes ?? null,
          firstEtaTimestampMs: first?.etaTimestampMs,
          isNextBus: isNext,
        });
      } else {
        list.push({
          route,
          minutes: first?.remainingMinutes ?? null,
          etaTimestampMs: first?.etaTimestampMs,
          firstMinutes: first?.remainingMinutes ?? null,
          firstEtaTimestampMs: first?.etaTimestampMs,
          isNextBus: false,
        });
      }
    }
    return list;
  }, [arrivals, stops, leadMinutes]);

  const renderRouteCard = (route: string, isRow2: boolean) => {
    const stop = stops.find((s) => s.route === route);
    const key = stop ? `${stop.id}-${stop.route}` : '';
    const keyStatus = key ? getKeyStatus(key) : 'ok';
    const routeArrivals = key ? arrivals[key]?.filter((a) => a.route === route) || [] : [];
    const arrival = routeArrivals[0] || null;
    const nextArrival = routeArrivals[1] || null;
    const styles = getPinnedStyles(
      keyStatus === 'error' ? null : (arrival?.remainingMinutes ?? null),
      leadMinutes
    );
    const isThisRouteActive = activeTimerRoute === route;
    const hasValidArrival =
      keyStatus !== 'error' &&
      arrival?.remainingMinutes !== null &&
      arrival?.remainingMinutes !== undefined;

    const firstIsUncatchable = hasValidArrival && (arrival?.remainingMinutes ?? 0) <= leadMinutes;
    const catchableNext = routeArrivals.find(
      (a) => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes
    );

    const etaClock = arrival ? formatEtaClock(arrival.etaTimestampMs) : null;

    return (
      <div
        key={route}
        onClick={() => {
          if (hasValidArrival) {
            onTriggerRouteTimer(route, null);
          }
        }}
        className={`surface-card rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-start transition-all select-none ${
          isThisRouteActive
            ? 'border-[#e27d48]/75 ring-1 ring-[#e27d48]/40 shadow-[0_0_16px_rgba(226,125,72,0.2)]'
            : hasValidArrival
            ? `${styles.border} hover:border-[#5b9bd5]/50 hover:brightness-105 cursor-pointer active:scale-[0.98]`
            : `${styles.border}`
        }`}
        title={
          hasValidArrival
            ? firstIsUncatchable && catchableNext
              ? `首班車（${arrival?.remainingMinutes}分）少於提前提醒時間趕不上，點擊自動為下班車（${catchableNext.remainingMinutes}分）倒數`
              : `點擊為【${route}】到站時間（${arrival?.remainingMinutes}分）開始出門倒數`
            : route
        }
      >
        {/* Top Row: Route + Active State */}
        <div className="flex items-center justify-center gap-1.5 w-full">
          <span
            translate="no"
            className="notranslate text-base sm:text-lg font-black text-[#7cb4e8] leading-tight tracking-tight"
          >
            {route}
          </span>
          {isThisRouteActive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ef996b] bg-[#e27d48]/15 border border-[#e27d48]/35 px-1.5 py-0.5 rounded-md leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e27d48] animate-ping" />
              倒數
            </span>
          )}
        </div>

        {/* Middle: Primary ETA (top-aligned across all sibling cards) */}
        <div className="mt-1.5 w-full flex flex-col items-center">
          {keyStatus === 'error' ? (
            <div className="flex justify-center py-1">{renderKeyStatusBadge('error')}</div>
          ) : pinnedLoading && (!stop || !arrivals[key]) ? (
            <div className="w-10 h-6 bg-white/10 animate-pulse rounded my-1 mx-auto" />
          ) : arrival ? (
            arrival.remainingMinutes !== null ? (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-baseline gap-1 flex-wrap justify-center">
                  <span className={`text-2xl font-black leading-none tabular-nums ${styles.text}`}>
                    {arrival.remainingMinutes}
                  </span>
                  <span className="text-[11px] font-bold text-[#8b95a5]">分</span>
                  {etaClock && isRow2 && (
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-[#8b95a5] ml-0.5">
                      {etaClock}
                    </span>
                  )}
                </div>
                {((etaClock && !isRow2) || arrival.isScheduled || arrival.isDelayed) && (
                  <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
                    {etaClock && !isRow2 && (
                      <span className="text-[11px] font-mono tabular-nums font-semibold text-[#8b95a5] leading-none">
                        {etaClock}
                      </span>
                    )}
                    {renderArrivalMetaBadges(arrival)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[#8b95a5] font-semibold block text-center leading-tight py-1">
                {arrival.statusRemark || arrival.remark || '暫無'}
              </span>
            )
          ) : (
            <span className="text-[11px] text-[#556070] font-semibold italic block text-center py-1">暫無</span>
          )}
          {keyStatus === 'delayed' && (
            <div className="flex justify-center mt-1">{renderKeyStatusBadge('delayed')}</div>
          )}
        </div>

        {/* Bottom: Single Inset Next-Bus Strip */}
        {keyStatus !== 'error' && nextArrival && nextArrival.remainingMinutes !== null && (
          <div className="w-full pt-2 mt-auto">
            <NextBusStrip
              arrival={nextArrival}
              highlight={firstIsUncatchable}
              onClick={(e) => {
                e.stopPropagation();
                onTriggerRouteTimer(
                  route,
                  nextArrival.remainingMinutes,
                  nextArrival.etaTimestampMs
                );
              }}
              title={`點擊為下班【${route}】（${nextArrival.remainingMinutes}分）計時`}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-[#1a1e24] border border-white/[0.07] rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.5)] overflow-hidden">
      <div
        onClick={onToggle}
        className="surface-raised w-full px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-white/[0.06] flex items-center justify-between hover:brightness-110 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-1 h-7 rounded-full bg-[#5b9bd5] shadow-[0_0_10px_rgba(91,155,213,0.65)] shrink-0" />
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#5b9bd5]/12 border border-[#5b9bd5]/25 text-[#7cb4e8] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#eef2f6] tracking-tight">
            往屯門
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {isOpen && <RefreshControl lastUpdated={lastUpdated} loading={loading} onRefresh={onRefresh} />}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#8b95a5]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8b95a5]" />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(isOpen || activeTimerRoute !== null) && (
          <motion.div
            initial={false}
            animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <DepartureTimer
                title="往屯門出門提醒計時器"
                targetDestination="往屯門"
                earliestRoute={earliestPinnedArrival?.route ?? null}
                earliestMinutes={earliestPinnedArrival?.minutes ?? null}
                earliestEtaTimestampMs={earliestPinnedArrival?.etaTimestampMs}
                earliestIsNextBus={earliestPinnedArrival?.isNextBus}
                availableRoutes={allPinnedRouteArrivals}
                selectedRouteTrigger={timerTrigger}
                onActiveRouteChange={onActiveTimerRouteChange}
                leadMinutes={leadMinutes}
                onLeadMinutesChange={onLeadMinutesChange}
                leadMinutesOptions={[8, 9, 10]}
                recommendedLeadMinutes={9}
                storageKey="bus_reminder_lead_minutes"
                onRefresh={onRefresh}
                isRefreshing={pinnedLoading && loading}
                lastUpdated={lastUpdated}
              />

              {/* Row 1: MTRB K-Routes */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {PINNED_MTRB_ROUTES.map((route) => renderRouteCard(route, false))}
              </div>

              {/* Row 2: KMB Routes */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {PINNED_KMB_ROUTES.map((route) => renderRouteCard(route, true))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});
