/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { BusArrival, KeyStatus } from '../../types';

export function getPinnedStyles(mins: number | null, leadMinutes: number = 9) {
  if (mins === null) {
    return {
      text: 'text-[#556070]',
      border: 'border-white/[0.06]',
      isUncatchable: false,
    };
  }
  if (mins <= leadMinutes) {
    return {
      text: 'text-rose-300/75',
      border: 'border-rose-500/25',
      isUncatchable: true,
    };
  }
  if (mins <= leadMinutes + 3) {
    return {
      text: 'text-emerald-300',
      border: 'border-emerald-400/35',
      isUncatchable: false,
    };
  }
  return {
    text: 'text-[#eef2f6]',
    border: 'border-white/[0.08]',
    isUncatchable: false,
  };
}

export function getHomeStyles(mins: number | null) {
  if (mins === null) {
    return { text: 'text-[#556070]', border: 'border-white/[0.06]' };
  }
  return { text: 'text-[#eef2f6]', border: 'border-white/[0.08]' };
}

export function getKowloonStyles(mins: number | null, leadMinutes: number = 7) {
  if (mins === null) {
    return {
      text: 'text-[#556070]',
      border: 'border-white/[0.06]',
      isUncatchable: false,
    };
  }
  if (mins <= leadMinutes) {
    return {
      text: 'text-rose-300/75',
      border: 'border-rose-500/25',
      isUncatchable: true,
    };
  }
  if (mins <= leadMinutes + 3) {
    return {
      text: 'text-emerald-300',
      border: 'border-emerald-400/35',
      isUncatchable: false,
    };
  }
  return {
    text: 'text-[#eef2f6]',
    border: 'border-white/[0.08]',
    isUncatchable: false,
  };
}

export function formatEtaClock(etaTimestampMs?: number): string | null {
  if (!etaTimestampMs || !Number.isFinite(etaTimestampMs)) return null;
  const d = new Date(etaTimestampMs);
  if (Number.isNaN(d.getTime())) return null;
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function renderKeyStatusBadge(status: KeyStatus): React.ReactNode {
  if (status === 'delayed') {
    return (
      <span className="text-[10px] font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/25 px-1.5 py-0.5 rounded-md whitespace-nowrap">
        連線延遲
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[10px] font-semibold text-rose-200 bg-rose-500/15 border border-rose-400/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
        連線異常
      </span>
    );
  }
  return null;
}

export function renderArrivalMetaBadges(arrival: BusArrival): React.ReactNode {
  return (
    <>
      {arrival.isScheduled && (
        <span
          className="text-[10px] font-semibold text-[#9aa5b5] bg-white/[0.06] border border-white/[0.09] px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap"
          title="編定班次（尚未有實時GPS定位）"
        >
          編定
        </span>
      )}
      {arrival.isDelayed && (
        <span
          className="text-[10px] font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/25 px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap"
          title="此班次或有延誤"
        >
          延誤
        </span>
      )}
    </>
  );
}

interface NextBusStripProps {
  arrival: BusArrival | null;
  highlight?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  showScheduledBadge?: boolean;
  fallbackText?: string;
}

export const NextBusStrip: React.FC<NextBusStripProps> = ({
  arrival,
  highlight = false,
  onClick,
  title,
  showScheduledBadge = true,
  fallbackText,
}) => {
  const etaClock = arrival ? formatEtaClock(arrival.etaTimestampMs) : null;
  const hasMinutes = arrival && arrival.remainingMinutes !== null;
  const hasSecondLine = Boolean(hasMinutes && (etaClock || (showScheduledBadge && arrival?.isScheduled)));

  return (
    <div
      onClick={onClick}
      title={title}
      className={`surface-inset w-full px-2 py-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        highlight
          ? 'border-[#e27d48]/35 bg-[#e27d48]/[0.08] hover:bg-[#e27d48]/15'
          : onClick
          ? 'hover:border-white/15 hover:brightness-110'
          : ''
      }`}
    >
      {hasMinutes ? (
        <>
          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
            <Clock
              className={`w-3 h-3 shrink-0 ${highlight ? 'text-[#ef996b]' : 'text-[#8b95a5]'}`}
            />
            <span
              className={`text-[10px] font-semibold ${
                highlight ? 'text-[#ef996b]' : 'text-[#8b95a5]'
              }`}
            >
              下班
            </span>
            <span
              className={`text-xs font-black tabular-nums leading-none ${
                highlight ? 'text-[#ffd7be]' : 'text-[#eef2f6]'
              }`}
            >
              {arrival.remainingMinutes}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                highlight ? 'text-[#ef996b]' : 'text-[#8b95a5]'
              }`}
            >
              分
            </span>
          </div>

          {hasSecondLine && (
            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
              {etaClock && (
                <span className="text-[10px] font-mono tabular-nums text-[#8b95a5] leading-none">
                  {etaClock}
                </span>
              )}
              {showScheduledBadge && arrival.isScheduled && (
                <span className="text-[9px] font-semibold text-[#9aa5b5] bg-white/[0.06] border border-white/[0.08] px-1 py-0.5 rounded leading-none">
                  編定
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3 shrink-0 text-[#8b95a5]" />
          <span className="text-[10px] font-semibold text-[#8b95a5]">下班</span>
          <span className="text-[10px] text-[#8b95a5] font-medium">
            {fallbackText ?? arrival?.statusRemark ?? arrival?.remark ?? '暫無'}
          </span>
        </div>
      )}
    </div>
  );
};
