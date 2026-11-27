/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, KeyStatus, StopInfo } from '../../types';
import { HOME_STOP_NAMES } from '../../config/stops';
import { RefreshControl } from './RefreshControl';
import {
  formatEtaClock,
  getHomeStyles,
  NextBusStrip,
  renderArrivalMetaBadges,
  renderKeyStatusBadge,
} from './sectionHelpers';

interface HomeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  stops: StopInfo[];
  arrivals: Record<string, BusArrival[]>;
  loading: boolean;
  lastUpdated: Date;
  onRefresh: () => void | Promise<void>;
  getKeyStatus: (key: string) => KeyStatus;
  nearestArea: string | null;
  hasLocation: boolean;
  getWalkingMinutes: (lat?: number, lng?: number) => number;
}

export const HomeSection: React.FC<HomeSectionProps> = React.memo(({
  isOpen,
  onToggle,
  stops,
  arrivals,
  loading,
  lastUpdated,
  onRefresh,
  getKeyStatus,
  nearestArea,
  hasLocation,
  getWalkingMinutes,
}) => {
  const orderedGroupNames =
    nearestArea && HOME_STOP_NAMES.includes(nearestArea)
      ? [nearestArea, ...HOME_STOP_NAMES.filter((name) => name !== nearestArea)]
      : HOME_STOP_NAMES;

  return (
    <section className="bg-[#1a1e24] border border-white/[0.07] rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.5)] overflow-hidden">
      <div
        onClick={onToggle}
        className="surface-raised w-full px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between hover:brightness-110 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-1 h-7 rounded-full bg-[#e27d48] shadow-[0_0_10px_rgba(226,125,72,0.65)] shrink-0" />
          <div className="w-9 h-9 rounded-xl bg-[#e27d48]/12 border border-[#e27d48]/25 text-[#ef996b] flex items-center justify-center shrink-0">
            <Bus className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#eef2f6] tracking-tight">
            回家
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3.5 sm:p-4 space-y-4">
              {orderedGroupNames.map((stopName) => {
                const stopsInGroup = stops.filter((s) => s.name === stopName);
                const isNearest = nearestArea === stopName;
                const areaStop = stopsInGroup[0];
                const walkingMins = hasLocation && areaStop
                  ? getWalkingMinutes(areaStop.lat, areaStop.lng)
                  : 0;

                return (
                  <div
                    key={stopName}
                    className={`surface-inset space-y-2.5 p-3 rounded-xl transition-all ${
                      isNearest ? 'border-[#38b2ac]/45 bg-[#192324]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3
                        className={`text-sm font-bold border-l-4 pl-2.5 flex items-center gap-2 ${
                          isNearest ? 'border-[#38b2ac] text-[#5ed1cb]' : 'border-[#e27d48] text-[#eef2f6]'
                        }`}
                      >
                        <span>{stopName.split('(')[0]}</span>
                        {isNearest && (
                          <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                            最近
                          </span>
                        )}
                      </h3>
                      {isNearest && walkingMins >= 0 && (
                        <span className="text-[11px] font-semibold text-[#8b95a5] tabular-nums">
                          {walkingMins === 0 ? '已到達巴士站' : `步程約 ${walkingMins} 分鐘`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {stopsInGroup.map((stop) => {
                        const key = `${stop.id}-${stop.route}`;
                        const keyStatus = getKeyStatus(key);
                        const routeArrivals = arrivals[key]?.filter((a) => a.route === stop.route) || [];
                        const arrival = routeArrivals[0] || null;
                        const nextArrival = routeArrivals[1] || null;
                        const styles = getHomeStyles(
                          keyStatus === 'error' ? null : (arrival?.remainingMinutes ?? null)
                        );

                        const canCatch =
                          keyStatus !== 'error' &&
                          arrival &&
                          arrival.remainingMinutes !== null &&
                          arrival.remainingMinutes >= walkingMins &&
                          arrival.remainingMinutes <= walkingMins + 3;

                        const isHungKiuK51 = stop.route === 'K51' && stop.name.includes('虹橋');
                        const etaClock = arrival ? formatEtaClock(arrival.etaTimestampMs) : null;

                        return (
                          <div
                            key={key}
                            className={`surface-card rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-start transition-all ${
                              canCatch
                                ? 'border-[#e27d48]/70 shadow-[0_0_12px_rgba(226,125,72,0.18)]'
                                : styles.border
                            }`}
                          >
                            <div className="flex flex-col items-center w-full text-center">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  translate="no"
                                  className="notranslate text-base sm:text-lg font-black text-[#7cb4e8] leading-tight tracking-tight"
                                >
                                  {stop.route}
                                </span>
                                {canCatch && <span className="w-1.5 h-1.5 bg-[#e27d48] rounded-full animate-ping" />}
                              </div>
                              {stop.stopSeqDesc && (
                                <span
                                  className="text-[11px] text-[#cfd7e3] font-semibold leading-tight"
                                  title={stop.stopSeqDesc}
                                >
                                  {stop.stopSeqDesc}
                                </span>
                              )}
                              {stop.route === 'K51' && stop.name.includes('虹橋') && (
                                <span className="text-[10px] text-emerald-300/90 font-semibold mt-0.5">往大欖</span>
                              )}
                              {stop.route === 'K51A' && stop.name.includes('虹橋') && (
                                <span className="text-[10px] text-emerald-300/90 font-semibold mt-0.5">往掃管笏</span>
                              )}
                            </div>

                            <div className="flex flex-col items-center w-full mt-2">
                              {keyStatus === 'error' ? (
                                renderKeyStatusBadge('error')
                              ) : loading && (!stop || !arrivals[key]) ? (
                                <div className="w-8 h-5 bg-white/10 animate-pulse rounded my-1" />
                              ) : arrival ? (
                                arrival.remainingMinutes !== null ? (
                                  <>
                                    <div className="flex items-baseline gap-1 flex-wrap justify-center">
                                      <span className={`text-xl sm:text-2xl font-black leading-none tabular-nums ${styles.text}`}>
                                        {arrival.remainingMinutes}
                                      </span>
                                      <span className="text-[11px] font-bold text-[#8b95a5]">分</span>
                                      {etaClock && (
                                        <span className="text-[11px] font-mono tabular-nums font-semibold text-[#8b95a5] ml-0.5">
                                          {etaClock}
                                        </span>
                                      )}
                                    </div>
                                    {(arrival.isScheduled || arrival.isDelayed) && (
                                      <div className="flex items-center justify-center gap-1 mt-1">
                                        {renderArrivalMetaBadges(arrival)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[11px] text-[#8b95a5] font-semibold text-center leading-tight py-1">
                                    {arrival.statusRemark || arrival.remark || '暫無'}
                                  </span>
                                )
                              ) : (
                                <span className="text-[11px] text-[#556070] font-semibold italic py-1">暫無</span>
                              )}

                              {keyStatus === 'delayed' && (
                                <div className="mt-1">{renderKeyStatusBadge('delayed')}</div>
                              )}

                              {/* 虹橋 K51 下班車時間 */}
                              {isHungKiuK51 && arrival && (
                                <div className="w-full pt-2 mt-auto">
                                  <NextBusStrip arrival={nextArrival} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});
