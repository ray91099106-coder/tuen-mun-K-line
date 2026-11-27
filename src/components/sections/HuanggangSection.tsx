/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, KeyStatus, StopInfo } from '../../types';
import { HuanggangLocationHint } from '../../hooks/useGeolocation';
import { RefreshControl } from './RefreshControl';
import { formatEtaClock, getKowloonStyles, NextBusStrip, renderKeyStatusBadge } from './sectionHelpers';

interface HuanggangSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  toStops: StopInfo[];
  fromStops: StopInfo[];
  arrivals: Record<string, BusArrival[]>;
  loading: boolean;
  lastUpdated: Date;
  onRefresh: () => void | Promise<void>;
  getKeyStatus: (key: string) => KeyStatus;
  activeDirection: 'to_port' | 'from_port';
  manualDirection: 'to_port' | 'from_port' | null;
  onSetManualDirection: (dir: 'to_port' | 'from_port' | null) => void;
  locationHint: HuanggangLocationHint | null;
}

export const HuanggangSection: React.FC<HuanggangSectionProps> = React.memo(({
  isOpen,
  onToggle,
  toStops,
  fromStops,
  arrivals,
  loading,
  lastUpdated,
  onRefresh,
  getKeyStatus,
  activeDirection,
  manualDirection,
  onSetManualDirection,
  locationHint,
}) => {
  const isToPortActive = activeDirection === 'to_port';
  const isFromPortActive = activeDirection === 'from_port';

  const renderStopCard = (stop: StopInfo, isToPort: boolean) => {
    const key = `${stop.id}-${stop.route}`;
    const keyStatus = getKeyStatus(key);
    const stopArrivals = arrivals[key] || [];
    const firstArrival = stopArrivals[0] || null;
    const nextArrival = stopArrivals[1] || null;
    const styles = getKowloonStyles(
      keyStatus === 'error' ? null : (firstArrival?.remainingMinutes ?? null)
    );

    const typeBadge = stop.operator === 'GMB' ? '小巴' : '巴士';
    const routeLabel = stop.route;

    let stationTitle = '';
    let stationDetail = '';
    if (isToPort) {
      if (stop.route === '44B1') {
        stationTitle = '第11站 市中心輕鐵站外';
        stationDetail = '屯門鄉事會路';
      } else if (stop.route === '44B') {
        stationTitle = '第一站 屯門站總站';
        stationDetail = '公共運輸交匯處';
      } else {
        stationTitle = '第9站 屯門市中心';
        stationDetail = '1屯門鄉事會路';
      }
    } else {
      stationTitle =
        stop.route === '44B1' ? '往 屯門碼頭' : stop.route === '44B' ? '往 屯門站' : '往 青山灣';
      stationDetail = '皇崗口岸總站';
    }

    const firstClock = firstArrival ? formatEtaClock(firstArrival.etaTimestampMs) : null;

    return (
      <div
        key={key}
        className={`surface-card rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-start transition-all ${styles.border}`}
      >
        <div className="flex flex-col items-center mb-2 w-full text-center">
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <span className="text-[9px] font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/25 px-1.5 py-0.5 rounded leading-none">
              {typeBadge}
            </span>
            <span
              translate="no"
              className="notranslate text-base sm:text-lg font-black text-[#f0bd6b] leading-tight tracking-tight"
            >
              {routeLabel}
            </span>
          </div>
          <span
            className="text-[10px] sm:text-[11px] font-semibold text-[#cfd7e3] leading-tight mt-1 line-clamp-1"
            title={stop.stopSeqDesc || stop.name}
          >
            {stationTitle}
          </span>
          <span className="text-[9px] text-[#8b95a5] font-medium truncate max-w-full">
            {stationDetail}
          </span>
          {isToPort && (
            <span className="text-[10px] font-semibold text-emerald-300/90 mt-0.5">往 皇崗口岸</span>
          )}
        </div>

        <div className="flex flex-col items-center w-full">
          {keyStatus === 'error' ? (
            renderKeyStatusBadge('error')
          ) : loading && !arrivals[key] ? (
            <div className="w-10 h-6 bg-white/10 animate-pulse rounded my-1" />
          ) : firstArrival ? (
            firstArrival.remainingMinutes !== null ? (
              <div className="flex items-baseline gap-1 justify-center">
                <span className={`text-xl sm:text-2xl font-black leading-none tabular-nums ${styles.text}`}>
                  {firstArrival.remainingMinutes}
                </span>
                <span className="text-[11px] font-bold text-[#8b95a5]">分</span>
                {firstClock && (
                  <span className="text-[10px] font-mono tabular-nums font-semibold text-[#8b95a5] ml-0.5">
                    {firstClock}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[#8b95a5] font-semibold text-center py-1">
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
          <div className="w-full pt-2 mt-auto">
            <NextBusStrip arrival={nextArrival} showScheduledBadge={false} />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-[#1a1e24] border border-white/[0.07] rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.5)] overflow-hidden">
      <div
        onClick={onToggle}
        className="surface-raised w-full px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between hover:brightness-110 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-1 h-7 rounded-full bg-[#e0a448] shadow-[0_0_10px_rgba(224,164,72,0.65)] shrink-0" />
          <div className="w-9 h-9 rounded-xl bg-[#e0a448]/12 border border-[#e0a448]/25 text-[#f0bd6b] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#eef2f6] tracking-tight">
            皇崗口岸
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
              {/* 1. 去口岸開車時間 (往皇崗口岸) */}
              <div
                onClick={() => onSetManualDirection('to_port')}
                className={`space-y-3 p-3 rounded-xl transition-all cursor-pointer ${
                  isToPortActive
                    ? 'surface-raised border-[#e0a448]/45 shadow-[0_8px_24px_rgba(224,164,72,0.12)]'
                    : 'surface-inset opacity-80 hover:opacity-100'
                }`}
                title="點擊切換高亮【去口岸開車時間】"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isToPortActive
                          ? 'bg-[#e0a448] shadow-[0_0_8px_rgba(224,164,72,0.8)] animate-pulse'
                          : 'bg-[#556070]'
                      }`}
                    />
                    <h3
                      className={`text-sm font-bold border-l-4 pl-2.5 ${
                        isToPortActive
                          ? 'border-[#e0a448] text-[#eef2f6]'
                          : 'border-[#556070] text-[#8b95a5]'
                      }`}
                    >
                      去口岸開車時間 (往皇崗口岸)
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isToPortActive && locationHint?.near === 'to_port' && (
                      <span className="text-[10px] text-amber-200 font-semibold bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        {locationHint.text}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isToPortActive
                          ? 'text-amber-200 bg-amber-500/15 border border-amber-400/25'
                          : 'text-[#8b95a5] bg-white/[0.05] border border-white/[0.06]'
                      }`}
                    >
                      屯門各站開出
                    </span>
                    {manualDirection === 'to_port' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetManualDirection(null);
                        }}
                        className="btn-tactile-secondary text-[10px] px-2 py-0.5 rounded-md font-semibold cursor-pointer"
                        title="恢復依據 GPS 位置自動判斷"
                      >
                        ↺自動
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {toStops.map((stop) => renderStopCard(stop, true))}
                </div>
              </div>

              {/* 2. 口岸開出時間 (往屯門) */}
              <div
                onClick={() => onSetManualDirection('from_port')}
                className={`space-y-3 p-3 rounded-xl transition-all cursor-pointer ${
                  isFromPortActive
                    ? 'surface-raised border-[#e0a448]/45 shadow-[0_8px_24px_rgba(224,164,72,0.12)]'
                    : 'surface-inset opacity-80 hover:opacity-100'
                }`}
                title="點擊切換高亮【口岸開出時間】"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFromPortActive
                          ? 'bg-[#e0a448] shadow-[0_0_8px_rgba(224,164,72,0.8)] animate-pulse'
                          : 'bg-[#556070]'
                      }`}
                    />
                    <h3
                      className={`text-sm font-bold border-l-4 pl-2.5 ${
                        isFromPortActive
                          ? 'border-[#e0a448] text-[#eef2f6]'
                          : 'border-[#556070] text-[#8b95a5]'
                      }`}
                    >
                      口岸開出時間 (往屯門)
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isFromPortActive && locationHint?.near === 'from_port' && (
                      <span className="text-[10px] text-amber-200 font-semibold bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        {locationHint.text}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isFromPortActive
                          ? 'text-amber-200 bg-amber-500/15 border border-amber-400/25'
                          : 'text-[#8b95a5] bg-white/[0.05] border border-white/[0.06]'
                      }`}
                    >
                      皇崗口岸總站開出
                    </span>
                    {manualDirection === 'from_port' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetManualDirection(null);
                        }}
                        className="btn-tactile-secondary text-[10px] px-2 py-0.5 rounded-md font-semibold cursor-pointer"
                        title="恢復依據 GPS 位置自動判斷"
                      >
                        ↺自動
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {fromStops.map((stop) => renderStopCard(stop, false))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});
