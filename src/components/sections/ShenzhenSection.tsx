/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, KeyStatus, StopInfo } from '../../types';
import { RefreshControl } from './RefreshControl';
import { formatEtaClock, getKowloonStyles, NextBusStrip, renderKeyStatusBadge } from './sectionHelpers';

interface ShenzhenSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  stops: StopInfo[];
  arrivals: Record<string, BusArrival[]>;
  loading: boolean;
  lastUpdated: Date;
  onRefresh: () => void | Promise<void>;
  getKeyStatus: (key: string) => KeyStatus;
}

export const ShenzhenSection: React.FC<ShenzhenSectionProps> = React.memo(({
  isOpen,
  onToggle,
  stops,
  arrivals,
  loading,
  lastUpdated,
  onRefresh,
  getKeyStatus,
}) => (
  <section className="bg-[#1a1e24] border border-white/[0.07] rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.5)] overflow-hidden">
    <div
      onClick={onToggle}
      className="surface-raised w-full px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-white/[0.06] flex items-center justify-between hover:brightness-110 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="w-1 h-7 rounded-full bg-[#9d7cd8] shadow-[0_0_10px_rgba(157,124,216,0.65)] shrink-0" />
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#9d7cd8]/12 border border-[#9d7cd8]/25 text-[#b79ced] flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#eef2f6] tracking-tight">
          深圳灣口岸
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
          <div className="p-3 sm:p-4 space-y-4">
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold border-l-4 border-[#9d7cd8] pl-2.5 text-[#eef2f6]">
                深圳灣口岸總站 (Shenzhen Bay Port)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {stops.map((stop) => {
                  const key = `${stop.id}-${stop.route}`;
                  const keyStatus = getKeyStatus(key);
                  const stopArrivals = arrivals[key] || [];
                  const firstArrival = stopArrivals[0] || null;
                  const nextArrival = stopArrivals[1] || null;
                  const styles = getKowloonStyles(
                    keyStatus === 'error' ? null : (firstArrival?.remainingMinutes ?? null)
                  );
                  const firstClock = firstArrival ? formatEtaClock(firstArrival.etaTimestampMs) : null;

                  return (
                    <div
                      key={key}
                      className={`surface-card rounded-xl p-3 sm:p-3.5 flex flex-col items-center justify-start transition-all ${styles.border}`}
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <span
                          translate="no"
                          className="notranslate text-base sm:text-lg font-black text-[#b79ced] leading-tight tracking-tight"
                        >
                          {stop.route}
                        </span>
                      </div>

                      <div className="flex flex-col items-center w-full">
                        {keyStatus === 'error' ? (
                          renderKeyStatusBadge('error')
                        ) : loading && !arrivals[key] ? (
                          <div className="w-12 h-6 bg-white/10 animate-pulse rounded my-1" />
                        ) : firstArrival ? (
                          firstArrival.remainingMinutes !== null ? (
                            <div className="flex items-baseline gap-1 justify-center">
                              <span className={`text-2xl font-black leading-none tabular-nums ${styles.text}`}>
                                {firstArrival.remainingMinutes}
                              </span>
                              <span className="text-[11px] font-bold text-[#8b95a5]">分</span>
                              {firstClock && (
                                <span className="text-[11px] font-mono tabular-nums font-semibold text-[#8b95a5] ml-0.5">
                                  {firstClock}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8b95a5] font-semibold py-1">
                              {firstArrival.statusRemark || firstArrival.remark || '暫無'}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-[#556070] font-semibold italic py-1">暫無</span>
                        )}

                        {keyStatus === 'delayed' && (
                          <div className="mt-1">{renderKeyStatusBadge('delayed')}</div>
                        )}
                      </div>

                      {keyStatus !== 'error' && nextArrival && (
                        <div className="w-full pt-2.5 mt-auto">
                          <NextBusStrip arrival={nextArrival} showScheduledBadge={false} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
));
