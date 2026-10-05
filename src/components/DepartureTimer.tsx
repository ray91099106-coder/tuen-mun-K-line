/**
 * DepartureTimer.tsx
 * Specialized timer for '往屯門' bus routes with real-time ETA traffic calibration,
 * dynamic delay/advance adjustment, manual +/- nudges, iOS Shortcuts sync, and Web Audio alarm.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, Bell, Volume2, AlertTriangle, X, ExternalLink, HelpCircle, 
  CheckCircle2, Play, Pause, Square, Sparkles, Smartphone, RefreshCw, 
  Plus, Minus, Activity, ShieldCheck, Gauge, Zap
} from 'lucide-react';
import { 
  playStartChime, playAlarmSound, stopAlarmSound, 
  requestScreenWakeLock, releaseScreenWakeLock 
} from '../services/timerSound';

export interface RouteArrivalInfo {
  route: string;
  minutes: number | null;
  firstMinutes?: number | null;
  isNextBus?: boolean;
}

interface DepartureTimerProps {
  title?: string;
  targetDestination?: string;
  earliestRoute: string | null;
  earliestMinutes: number | null;
  earliestIsNextBus?: boolean;
  availableRoutes?: RouteArrivalInfo[];
  selectedRouteTrigger?: { 
    route: string; 
    minutes: number; 
    isNextBus?: boolean; 
    originalMinutes?: number; 
    timestamp?: number 
  } | null;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  lastUpdated?: Date;
  onActiveRouteChange?: (route: string | null) => void;
  leadMinutes?: number;
  onLeadMinutesChange?: (mins: number) => void;
  leadMinutesOptions?: number[];
  recommendedLeadMinutes?: number;
  storageKey?: string;
}

interface CalibrateNotice {
  type: 'delay' | 'faster' | 'sync' | 'manual' | 'urgent';
  message: string;
  timestamp: Date;
}

export const DepartureTimer: React.FC<DepartureTimerProps> = ({
  title,
  targetDestination,
  earliestRoute,
  earliestMinutes,
  earliestIsNextBus = false,
  availableRoutes = [],
  selectedRouteTrigger,
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  onActiveRouteChange,
  leadMinutes: propLeadMinutes,
  onLeadMinutesChange,
  leadMinutesOptions = [7, 8, 9],
  recommendedLeadMinutes = 8,
  storageKey = 'bus_reminder_lead_minutes',
}) => {
  // Configuration
  const [internalLeadMinutes, setInternalLeadMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (leadMinutesOptions.includes(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return recommendedLeadMinutes;
  });

  const leadMinutes = propLeadMinutes !== undefined ? propLeadMinutes : internalLeadMinutes;

  const handleSetLeadMinutes = (mins: number) => {
    const oldLead = leadMinutes;
    if (onLeadMinutesChange) {
      onLeadMinutesChange(mins);
    }
    setInternalLeadMinutes(mins);
    try {
      localStorage.setItem(storageKey, mins.toString());
    } catch (e) {
      // ignore
    }

    // If timer is running in normal route mode, seamlessly adjust remaining time
    if (isRunning && lastTriggerMode !== 'test' && mins !== oldLead) {
      if (remainingSeconds <= 120) {
        setLastCalibrateNotice({
          type: 'manual',
          message: `提前提醒設定已儲存為【${mins}分鐘】，本次最後 2 分鐘倒數保持鎖定進行`,
          timestamp: new Date()
        });
        return;
      }
      const diffMinutes = oldLead - mins; // e.g. from 8m to 7m -> +1m countdown; from 8m to 9m -> -1m countdown
      adjustRemainingMinutes(diffMinutes);
      setLastCalibrateNotice({
        type: 'manual',
        message: `提前出門提醒已調整為【${mins}分鐘】，倒數已同步調整`,
        timestamp: new Date()
      });
    }
  };
  const [autoCalibrate, setAutoCalibrate] = useState<boolean>(true); // Auto dynamic ETA calibration

  // Timer operational states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedSeconds, setPausedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalInitialSeconds, setTotalInitialSeconds] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<string>('');
  const [targetIsNextBus, setTargetIsNextBus] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [alarmCountdown, setAlarmCountdown] = useState<number>(15);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showShortcutPromptModal, setShowShortcutPromptModal] = useState<boolean>(false);
  const [lastTriggerMode, setLastTriggerMode] = useState<'normal' | 'test'>('normal');

  // Exact target timestamps for drift calculation
  const [targetAlarmTimestamp, setTargetAlarmTimestamp] = useState<number>(0);
  const [targetBusArrivalTimestamp, setTargetBusArrivalTimestamp] = useState<number>(0);
  const [lastSyncedBusEta, setLastSyncedBusEta] = useState<number | null>(null);
  const [lastCalibrateNotice, setLastCalibrateNotice] = useState<CalibrateNotice | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastHandledTriggerRef = useRef<number | null>(null);

  // Trigger iOS Shortcut URL scheme
  const triggerIosShortcut = (mins: number) => {
    try {
      const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent('巴士提醒')}&input=${mins}`;
      window.location.href = shortcutUrl;
    } catch (e) {
      console.warn('Could not launch shortcut url scheme', e);
    }
  };

  // Start web timer
  const startTimer = (mins: number, route: string, isTest = false, isNextBus = false) => {
    const routeName = route || earliestRoute || (targetDestination || '往屯門');
    setActiveRoute(routeName);
    setLastTriggerMode(isTest ? 'test' : 'normal');
    setTargetIsNextBus(isNextBus);

    playStartChime();
    requestScreenWakeLock();

    const now = Date.now();

    if (isTest) {
      const totalSecs = 10;
      setTotalInitialSeconds(totalSecs);
      setRemainingSeconds(totalSecs);
      setTargetAlarmTimestamp(now + 10000);
      setTargetBusArrivalTimestamp(now + 10000);
      setLastSyncedBusEta(null);
      setLastCalibrateNotice(null);
    } else {
      // Find actual current ETA for this route
      const currentRouteInfo = availableRoutes.find(r => r.route === routeName);
      let busEtaMins: number;
      if (currentRouteInfo && currentRouteInfo.minutes !== null) {
        if (!isNextBus && currentRouteInfo.isNextBus && currentRouteInfo.firstMinutes !== null && currentRouteInfo.firstMinutes !== undefined) {
          busEtaMins = currentRouteInfo.firstMinutes;
        } else {
          busEtaMins = currentRouteInfo.minutes;
        }
      } else {
        busEtaMins = mins + leadMinutes;
      }

      const busArrivalMs = now + (busEtaMins * 60 * 1000);
      const alarmMs = busArrivalMs - (leadMinutes * 60 * 1000);
      const totalSecs = Math.max(1, Math.round((alarmMs - now) / 1000));

      setTargetBusArrivalTimestamp(busArrivalMs);
      setTargetAlarmTimestamp(alarmMs);
      setTotalInitialSeconds(totalSecs);
      setRemainingSeconds(totalSecs);
      setLastSyncedBusEta(busEtaMins);
      setLastCalibrateNotice(null);
    }

    setIsRunning(true);
    setIsPaused(false);
    setIsAlarmActive(false);
  };

  const togglePause = () => {
    if (isPaused) {
      // Resume: reconstruct alarm timestamp based on remaining seconds
      const now = Date.now();
      const newAlarmMs = now + (pausedSeconds * 1000);
      setTargetAlarmTimestamp(newAlarmMs);
      setTargetBusArrivalTimestamp(newAlarmMs + (leadMinutes * 60 * 1000));
      setIsPaused(false);
    } else {
      // Pause
      setPausedSeconds(remainingSeconds);
      setIsPaused(true);
    }
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    setRemainingSeconds(0);
    releaseScreenWakeLock();
    stopAlarmSound();
    setIsAlarmActive(false);
    setLastCalibrateNotice(null);
  };

  const stopAlarm = () => {
    stopAlarmSound();
    setIsAlarmActive(false);
    setIsRunning(false);
    setIsPaused(false);
    releaseScreenWakeLock();
    setLastCalibrateNotice(null);
  };

  // Timer countdown loop - precisely calculating from target timestamp
  useEffect(() => {
    if (isRunning && !isPaused) {
      const now = Date.now();
      const secsLeft = Math.max(0, Math.round((targetAlarmTimestamp - now) / 1000));
      setRemainingSeconds(secsLeft);
      if (secsLeft <= 0) {
        setIsRunning(false);
        setIsPaused(false);
        setRemainingSeconds(0);
        setIsAlarmActive(true);
        playAlarmSound();
        return;
      }

      timerRef.current = window.setInterval(() => {
        const currentNow = Date.now();
        const currentSecsLeft = Math.max(0, Math.round((targetAlarmTimestamp - currentNow) / 1000));

        if (currentSecsLeft <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRunning(false);
          setIsPaused(false);
          setRemainingSeconds(0);
          setIsAlarmActive(true);
          playAlarmSound();
        } else {
          setRemainingSeconds(currentSecsLeft);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, targetAlarmTimestamp]);

  // Clean up wake lock and sound when unmounted
  useEffect(() => {
    return () => {
      releaseScreenWakeLock();
      stopAlarmSound();
    };
  }, []);

  // Auto-stop alarm after 15 seconds to prevent unattended continuous ringing
  useEffect(() => {
    let countdownInterval: number | null = null;
    let autoStopTimer: number | null = null;

    if (isAlarmActive) {
      setAlarmCountdown(15);

      countdownInterval = window.setInterval(() => {
        setAlarmCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      autoStopTimer = window.setTimeout(() => {
        stopAlarm();
      }, 15000);
    } else {
      setAlarmCountdown(15);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (autoStopTimer) clearTimeout(autoStopTimer);
    };
  }, [isAlarmActive]);

  // Handle selectedRouteTrigger from bus grid cards
  useEffect(() => {
    if (selectedRouteTrigger && selectedRouteTrigger.minutes !== undefined && selectedRouteTrigger.minutes !== null) {
      if (selectedRouteTrigger.timestamp && lastHandledTriggerRef.current === selectedRouteTrigger.timestamp) {
        return;
      }
      lastHandledTriggerRef.current = selectedRouteTrigger.timestamp || Date.now();

      const { route, minutes, isNextBus, originalMinutes } = selectedRouteTrigger;
      const targetCountdown = Math.max(0, minutes - leadMinutes);
      startTimer(targetCountdown, route, false, Boolean(isNextBus));
      if (isNextBus && originalMinutes !== undefined) {
        setLastCalibrateNotice({
          type: 'delay',
          message: `💡【${route}】首班車（${originalMinutes}分）少於提前提醒時間趕不上，已自動為下一班車（${minutes}分）設定倒數 ${targetCountdown} 分鐘！`,
          timestamp: new Date()
        });
      } else if (minutes <= leadMinutes) {
        setLastCalibrateNotice({
          type: 'urgent',
          message: `🚨【${route}】到站時間（${minutes}分鐘）已進入出門提醒時間（${leadMinutes}分鐘），請立即出門！`,
          timestamp: new Date()
        });
      }
    }
  }, [selectedRouteTrigger, leadMinutes]);

  // Sync active route back to parent (App.tsx)
  useEffect(() => {
    if (onActiveRouteChange) {
      onActiveRouteChange(isRunning ? activeRoute : null);
    }
  }, [isRunning, activeRoute, onActiveRouteChange]);

  // 🔄 REAL-TIME TRAFFIC AUTO-CALIBRATION
  // Synchronize timer with live bus ETA updates (every 30s or on refresh)
  useEffect(() => {
    if (!isRunning || isPaused || lastTriggerMode === 'test' || !autoCalibrate) {
      return;
    }

    const now = Date.now();
    const secsLeft = Math.max(0, Math.round((targetAlarmTimestamp - now) / 1000));

    // 🔒 核心保護：當計時器倒數至小於等於 2 分鐘 (120 秒) 時，
    // 立即停止更新計時器調節到站時間，強制倒數下去！
    // 徹底避免計時器發現到站時間小於預設時間（例如小於 8 分鐘被跳至下一班時間較長的 15 分鐘），
    // 導致計時器永遠無法響起的情況！
    if (secsLeft <= 120 || remainingSeconds <= 120) {
      return;
    }

    // Locate the active route in live availableRoutes
    let currentBusInfo = availableRoutes.find(r => r.route === activeRoute);
    if (!currentBusInfo && (activeRoute === '首班車' || activeRoute === '往屯門' || activeRoute === '出九龍')) {
      currentBusInfo = availableRoutes
        .filter(r => r.minutes !== null && r.minutes > 0)
        .sort((a, b) => (a.minutes ?? 999) - (b.minutes ?? 999))[0];
    }

    if (!currentBusInfo) return;

    // 判斷當前計時追蹤的到底是首班車還是下班車
    let currentBusEta: number | null = null;
    if (!targetIsNextBus) {
      // 我們計時的是首班車
      if (currentBusInfo.isNextBus && currentBusInfo.firstMinutes !== null && currentBusInfo.firstMinutes !== undefined) {
        // availableRoutes 已經因為首班車 ≤ leadMinutes 自動跳轉至下班車（例如 15 分鐘）
        // 但我們正在為首班車倒數，真實首班車到站時間為 firstMinutes
        currentBusEta = currentBusInfo.firstMinutes;
      } else {
        currentBusEta = currentBusInfo.minutes;
      }
    } else {
      // 我們計時的是下班車
      currentBusEta = currentBusInfo.minutes;
    }

    if (currentBusEta === null) return;

    // 🛡️ 防跳班保護 1：若首班車已進入出門提醒時間（≤ leadMinutes，例如 ≤ 8 分鐘）
    // 說明首班車已到達預設出門範圍，絕不可拿下一班車（如 15 分鐘）延長倒數時間！
    // 計時器應維持原定節奏強制倒數下去，確保時間一到準時響鈴
    if (!targetIsNextBus && currentBusEta <= leadMinutes) {
      return;
    }

    // 🛡️ 防跳班保護 2：若最新 ETA 相比上次記錄突然大幅增加（例如相差 3 分鐘以上）
    // 說明班次已換班跳轉至下一班車，絕不可向後延長倒數時間！
    if (lastSyncedBusEta !== null && (currentBusEta - lastSyncedBusEta) >= 3) {
      return;
    }

    // 計算正常路況漂移
    const newProjectedBusArrival = now + (currentBusEta * 60 * 1000);
    const scheduledBusArrival = targetAlarmTimestamp + (leadMinutes * 60 * 1000);
    const driftSecs = (newProjectedBusArrival - scheduledBusArrival) / 1000;
    const driftMinutes = Math.round(driftSecs / 60);

    // 只有在合理路況漂移（1 ~ 2 分鐘微幅調整）且調整後倒數時間依然大於 2 分鐘時才微調
    if (Math.abs(driftMinutes) >= 1 && Math.abs(driftMinutes) <= 3) {
      const shiftMs = driftMinutes * 60 * 1000;
      const newTargetAlarm = targetAlarmTimestamp + shiftMs;
      const newSecs = Math.max(1, Math.round((newTargetAlarm - now) / 1000));

      // 若調節後會導致剩餘時間小於等於 2 分鐘，則鎖定進入最後強制倒數，不再頻繁變更
      if (newSecs <= 120) {
        return;
      }

      setTargetAlarmTimestamp(newTargetAlarm);
      setTargetBusArrivalTimestamp(prev => prev + shiftMs);
      setRemainingSeconds(newSecs);
      if (newSecs > totalInitialSeconds) {
        setTotalInitialSeconds(newSecs);
      }
      setLastSyncedBusEta(currentBusEta);

      if (driftMinutes > 0) {
        setLastCalibrateNotice({
          type: 'delay',
          message: `🚦 交通延誤校準：【${activeRoute}】最新到站由 ${lastSyncedBusEta ?? (currentBusEta - driftMinutes)}分 延長至 ${currentBusEta}分，倒數已自動延長 +${driftMinutes} 分鐘`,
          timestamp: new Date()
        });
      } else {
        setLastCalibrateNotice({
          type: 'faster',
          message: `🏎️ 班次提早校準：【${activeRoute}】最新到站由 ${lastSyncedBusEta ?? (currentBusEta - driftMinutes)}分 提早至 ${currentBusEta}分，倒數已自動縮短 ${Math.abs(driftMinutes)} 分鐘`,
          timestamp: new Date()
        });
      }
    }
  }, [
    availableRoutes, 
    lastUpdated, 
    isRunning, 
    isPaused, 
    lastTriggerMode, 
    autoCalibrate, 
    activeRoute, 
    targetAlarmTimestamp, 
    leadMinutes, 
    totalInitialSeconds, 
    lastSyncedBusEta,
    targetIsNextBus,
    remainingSeconds
  ]);

  // Manual Nudge (+/- minutes)
  const adjustRemainingMinutes = (deltaMins: number) => {
    if (!isRunning) return;
    const shiftMs = deltaMins * 60 * 1000;
    const newAlarmMs = targetAlarmTimestamp + shiftMs;
    const now = Date.now();
    const newSecs = Math.max(1, Math.round((newAlarmMs - now) / 1000));

    setTargetAlarmTimestamp(newAlarmMs);
    setTargetBusArrivalTimestamp(prev => prev + shiftMs);
    setRemainingSeconds(newSecs);
    if (newSecs > totalInitialSeconds) {
      setTotalInitialSeconds(newSecs);
    }

    setLastCalibrateNotice({
      type: 'manual',
      message: `手動微調：倒數已${deltaMins > 0 ? `延長 +${deltaMins}` : `縮短 ${Math.abs(deltaMins)}`} 分鐘`,
      timestamp: new Date()
    });
  };

  // Immediate manual refresh & calibrate
  const handleForceCalibrate = async () => {
    if (remainingSeconds <= 120) {
      setLastCalibrateNotice({
        type: 'sync',
        message: `🔒 倒數已進入最後 2 分鐘，已鎖定強制倒數出門，不再調節時間`,
        timestamp: new Date()
      });
      return;
    }
    if (onRefresh) {
      await onRefresh();
    }
    setLastCalibrateNotice({
      type: 'sync',
      message: `🔄 已取得最新巴士即時路況，倒數已精準校準！`,
      timestamp: new Date()
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalInitialSeconds > 0 
    ? Math.max(0, Math.min(100, ((totalInitialSeconds - remainingSeconds) / totalInitialSeconds) * 100))
    : 0;

  // Determine earliest target countdown
  const isEarliestOverLead = earliestMinutes !== null && earliestMinutes > leadMinutes;
  const targetCountdownMinutes = isEarliestOverLead && earliestMinutes !== null ? earliestMinutes - leadMinutes : 0;

  // Filter other routes that are > leadMinutes for quick selection
  const otherRoutesOverLead = availableRoutes.filter(
    r => r.minutes !== null && r.minutes > leadMinutes && r.route !== earliestRoute
  );

  // Current ETA of active route for live display
  const currentActiveRouteInfo = availableRoutes.find(r => r.route === activeRoute);
  const currentLiveEta = useMemo(() => {
    if (!currentActiveRouteInfo) return lastSyncedBusEta;
    if (!targetIsNextBus && currentActiveRouteInfo.isNextBus && currentActiveRouteInfo.firstMinutes !== null && currentActiveRouteInfo.firstMinutes !== undefined) {
      return currentActiveRouteInfo.firstMinutes;
    }
    return currentActiveRouteInfo.minutes ?? lastSyncedBusEta;
  }, [currentActiveRouteInfo, targetIsNextBus, lastSyncedBusEta]);

  return (
    <div className="w-full mb-3">
      {/* 1. Alarm Alert Modal (when timer finishes) */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-red-500 animate-bounce">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Bell className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">🔔 時間到！請出門！</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {lastTriggerMode === 'test' ? (
                <>測試倒數已完成！響鈴功能正常運作。</>
              ) : (
                <>
                  【<strong className="text-blue-600 font-black">{activeRoute}</strong>】（{targetDestination || '往屯門'}）預計還有約 <strong className="text-red-600 font-black">{leadMinutes} 分鐘</strong> 抵達！
                  <br /><span className="text-xs text-slate-500 mt-1 block">（已配合即時路況精準提醒）</span>
                </>
              )}
            </p>
            <button
              onClick={stopAlarm}
              className="w-full py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg shadow-red-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>停止鬧鐘</span>
              <span className="text-xs font-bold bg-white/25 px-2.5 py-0.5 rounded-full">
                {alarmCountdown}s 後自動關閉
              </span>
            </button>
            <p className="text-[11px] text-slate-400 mt-2.5">
              ⏱️ 鈴聲將在 {alarmCountdown} 秒後自動停止，避免長時間無人時響起
            </p>
          </div>
        </div>
      )}

      {/* 2. Active Countdown Card (when running) */}
      {isRunning ? (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 text-white rounded-2xl p-4 shadow-xl border border-blue-400/40 relative overflow-hidden">
          {/* Top Status & Controls */}
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {isPaused 
                  ? '⏸️ 倒數已暫停' 
                  : (lastTriggerMode === 'test' ? '⚡ 測試倒數進行中' : `⏳【${activeRoute}】${targetDestination ? `${targetDestination}` : '出門'}提醒倒數中`)}
              </span>
            </div>

            {/* Auto-calibration badge & toggle */}
            {lastTriggerMode !== 'test' && (
              <div className="flex items-center gap-1.5 ml-auto">
                {remainingSeconds <= 120 ? (
                  <span 
                    className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-400/25 text-amber-200 border border-amber-300/50 flex items-center gap-1 shadow-xs"
                    title="倒數少於2分鐘：已停止調節到站時間，鎖定強制倒數出門"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                    最後2分鐘鎖定
                  </span>
                ) : (
                  <button
                    onClick={() => setAutoCalibrate(prev => !prev)}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      autoCalibrate 
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30' 
                        : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20'
                    }`}
                    title={autoCalibrate ? '已啟用路況自動校準：每30秒跟隨巴士即時情況調校倒數' : '點擊啟用路況自動校準'}
                  >
                    <Activity className={`w-3 h-3 ${autoCalibrate ? 'text-emerald-300 animate-pulse' : 'text-slate-400'}`} />
                    {autoCalibrate ? '實時路況校準中' : '自動校準已關閉'}
                  </button>
                )}

                <button
                  onClick={cancelTimer}
                  className="text-xs bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold transition-all cursor-pointer"
                  title="撤銷倒數"
                >
                  <X className="w-3.5 h-3.5" /> 撤銷
                </button>
              </div>
            )}
          </div>

          {/* Main Countdown Numbers */}
          <div className="flex items-baseline justify-between mb-2.5">
            <div>
              <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight drop-shadow ${isPaused ? 'text-amber-200' : 'text-white'}`}>
                {formatTime(remainingSeconds)}
              </div>
              <div className="text-xs text-blue-100 mt-1 flex items-center gap-2 flex-wrap">
                {lastTriggerMode === 'test' ? (
                  <span>10 秒後將在手機響鈴</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>🎯 提前提醒：</span>
                      {leadMinutesOptions.map(mins => (
                        <button
                          key={mins}
                          onClick={() => handleSetLeadMinutes(mins)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            leadMinutes === mins
                              ? 'bg-amber-300 text-slate-900 shadow-xs font-black'
                              : 'bg-white/15 hover:bg-white/25 text-blue-100'
                          }`}
                          title={`切換為到站前 ${mins} 分鐘提醒出門`}
                        >
                          {mins}分{mins === recommendedLeadMinutes ? '(推薦)' : ''}
                        </button>
                      ))}
                    </div>
                    {currentLiveEta !== null && (
                      <span className="bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-400/30 font-semibold text-blue-200">
                        🚌【{activeRoute}】最新到站：<strong className="text-amber-300">{currentLiveEta} 分鐘</strong>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Traffic Adjustment Notification Banner */}
          {lastCalibrateNotice && (
            <div className={`mb-3 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all shadow-inner ${
              lastCalibrateNotice.type === 'delay' 
                ? 'bg-amber-500/25 border border-amber-400/50 text-amber-100' 
                : lastCalibrateNotice.type === 'faster'
                ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-100'
                : lastCalibrateNotice.type === 'urgent'
                ? 'bg-red-500/30 border border-red-400/60 text-red-100'
                : 'bg-white/15 border border-white/25 text-blue-100'
            }`}>
              <div className="flex items-center gap-1.5 flex-1">
                <Gauge className="w-4 h-4 shrink-0" />
                <span>{lastCalibrateNotice.message}</span>
              </div>
              <span className="text-[10px] text-blue-200/70 shrink-0">剛才</span>
            </div>
          )}

          {/* Lock Banner for <= 2 minutes */}
          {remainingSeconds <= 120 && lastTriggerMode !== 'test' && (
            <div className="mb-3 p-2.5 rounded-xl text-xs font-bold bg-amber-400/25 border border-amber-300/50 text-amber-100 flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>⚡ 倒數已小於 2 分鐘：已停止調節到站時間，鎖定強制倒數，時間到達必定響鈴！</span>
              </div>
              <span className="text-[10px] bg-amber-300/30 text-amber-200 px-2 py-0.5 rounded border border-amber-300/40 shrink-0 font-black">
                🔒 鎖定進行中
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-blue-950/50 rounded-full h-2 overflow-hidden mb-3">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Manual Adjust Controls Toolbar (+1m, -1m, +3m, -3m, Force Refresh) */}
          {lastTriggerMode !== 'test' && (
            <div className="bg-blue-950/40 border border-blue-400/20 rounded-xl p-2 mb-3 flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-blue-200 flex items-center gap-1">
                ⏱️ 即時微調：
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustRemainingMinutes(-1)}
                  className="px-2 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  title="減少 1 分鐘"
                >
                  -1分
                </button>
                <button
                  onClick={() => adjustRemainingMinutes(1)}
                  className="px-2 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  title="增加 1 分鐘"
                >
                  +1分
                </button>
                <button
                  onClick={() => adjustRemainingMinutes(-3)}
                  className="px-2 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  title="減少 3 分鐘"
                >
                  -3分
                </button>
                <button
                  onClick={() => adjustRemainingMinutes(3)}
                  className="px-2 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  title="增加 3 分鐘"
                >
                  +3分
                </button>
              </div>

              <button
                onClick={handleForceCalibrate}
                disabled={isRefreshing}
                className="px-2.5 py-1 bg-blue-500/40 hover:bg-blue-500/60 active:scale-95 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ml-auto border border-blue-300/30"
                title="立即聯網獲取最新巴士到站時間並校準"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                校對路況
              </button>
            </div>
          )}

          {/* Action Toolbar: Pause/Resume, Cancel, iPhone Sync */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <button
              onClick={togglePause}
              className={`px-3.5 py-2 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ${
                isPaused 
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-900' 
                  : 'bg-white/25 hover:bg-white/35 text-white'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-slate-900" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
              {isPaused ? '繼續倒數' : '暫停'}
            </button>

            <button
              onClick={cancelTimer}
              className="px-3.5 py-2 bg-red-600/80 hover:bg-red-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              撤銷倒數
            </button>

            <button
              onClick={() => setShowShortcutPromptModal(true)}
              className="px-3 py-2 bg-white text-blue-900 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:bg-blue-50 active:scale-95 transition-all cursor-pointer ml-auto"
              title="同步到 iPhone 系統計時器以支援鎖定螢幕"
            >
              <Smartphone className="w-3.5 h-3.5" />
              iPhone 系統計時
            </button>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-blue-400/20 text-[11px] text-blue-200/80 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              螢幕防休眠保持開啟中，時間到時網頁會響鈴
            </span>
            <button 
              onClick={() => {
                playAlarmSound();
                setTimeout(() => stopAlarmSound(), 2000);
              }}
              className="underline hover:text-white cursor-pointer"
            >
              測試聲音
            </button>
          </div>
        </div>
      ) : (
        /* 3. Permanent Departure Timer Panel */
        <div className={`rounded-2xl p-3 sm:p-4 border-2 transition-all ${
          isEarliestOverLead 
            ? 'bg-amber-50/90 border-amber-400 shadow-sm' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${
                isEarliestOverLead ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    ⏱️ {title || '往屯門出門提醒計時器'}
                  </span>
                  {isEarliestOverLead ? (
                    <span className="text-[11px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                      首班車 &gt; {leadMinutes}分鐘
                    </span>
                  ) : earliestMinutes !== null ? (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      首班車 ≤ {leadMinutes}分鐘 (即將抵達)
                    </span>
                  ) : null}
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Activity className="w-2.5 h-2.5 text-blue-600" />
                    支援路況即時校準
                  </span>
                </div>

                <div className="mt-1">
                  {isEarliestOverLead && earliestRoute ? (
                    <p className="text-sm font-black text-slate-800 leading-snug">
                      首班可搭班次【<span className="text-blue-700 font-black">{earliestRoute}</span>】
                      {earliestIsNextBus && (
                        <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded ml-1 inline-block">
                          下一班車
                        </span>
                      )}
                      預計 <span className="text-red-600 font-black">{earliestMinutes} 分鐘</span> 後到達。
                      <span className="font-normal text-xs text-slate-600 block sm:inline sm:ml-1">
                        點擊開始倒數 <strong className="text-amber-900 font-bold">{targetCountdownMinutes} 分鐘</strong>，於距到站 {leadMinutes} 分鐘時響鈴出門！
                      </span>
                    </p>
                  ) : earliestMinutes !== null && earliestRoute ? (
                    <p className="text-xs text-slate-600">
                      所有班次約 <strong className="text-emerald-700 font-bold">{earliestMinutes} 分鐘</strong> 內到達（已少於 {leadMinutes} 分鐘，可即時出門）。
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      正在獲取即時到站時間，你亦可隨時點擊「測試10秒」測試響鈴或設定計時。
                    </p>
                  )}
                </div>

                {/* Lead Time Selection */}
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                  <span className="font-bold text-[11px] text-slate-500">提前提醒：</span>
                  {leadMinutesOptions.map(mins => (
                    <button
                      key={mins}
                      onClick={() => handleSetLeadMinutes(mins)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        leadMinutes === mins 
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 font-black' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-400'
                      }`}
                    >
                      {mins}分鐘{mins === recommendedLeadMinutes ? '（推薦）' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              {isEarliestOverLead && earliestRoute && (
                <button
                  onClick={() => startTimer(targetCountdownMinutes, earliestRoute, false, Boolean(earliestIsNextBus))}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer ring-2 ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-white" />
                  開始倒數 {targetCountdownMinutes} 分鐘
                </button>
              )}

              <button
                onClick={() => startTimer(0, earliestRoute || '測試', true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                title="立即測試 10 秒倒數與響鈴"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ⚡ 測試10秒
              </button>

              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
                title="iPhone 原生計時 (iOS 捷徑) 教學"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary bar: Other routes over lead minutes & Test tone */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 flex-wrap">
              {otherRoutesOverLead.length > 0 && (
                <>
                  <span className="text-[11px] font-bold text-slate-500">其他可搭班次：</span>
                  {otherRoutesOverLead.map((r) => {
                    const cMins = (r.minutes ?? 0) - leadMinutes;
                    return (
                      <button
                        key={r.route}
                        onClick={() => startTimer(cMins, r.route, false, Boolean(r.isNextBus))}
                        className="text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-blue-700 font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                      >
                        【{r.route}{r.isNextBus ? '(下班)' : ''}】{r.minutes}分 ➜ 倒數{cMins}分
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => {
                  playStartChime();
                  setTimeout(() => playAlarmSound(), 300);
                  setTimeout(() => stopAlarmSound(), 3000);
                }}
                className="text-[11px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-600" /> 試聽響鈴
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. iPhone Shortcuts Sync Confirmation Modal */}
      {showShortcutPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">啟動 iPhone 系統計時器</h3>
              </div>
              <button
                onClick={() => setShowShortcutPromptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              這會將倒數（約 <strong>{Math.ceil(remainingSeconds / 60)} 分鐘</strong>）同步到 iPhone 內建時鐘。
              <br /><br />
              <strong className="text-amber-700 bg-amber-50 p-2 rounded-lg block border border-amber-200">
                ⚠️ 注意：iPhone 要求你的「捷徑」App 內必須先存在一個名為「巴士提醒」的捷徑。
              </strong>
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setShowShortcutPromptModal(false);
                  triggerIosShortcut(Math.ceil(remainingSeconds / 60));
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                我已建立「巴士提醒」捷徑，立即啟動
              </button>

              <button
                onClick={() => {
                  setShowShortcutPromptModal(false);
                  setShowHelpModal(true);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                教我如何 10 秒建立捷徑
              </button>

              <button
                onClick={() => setShowShortcutPromptModal(false)}
                className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium text-xs transition-all cursor-pointer"
              >
                留在網頁倒數即可（螢幕常亮也會響鈴與即時校準）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. iOS Shortcuts Setup Instructions Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h3 className="font-black text-slate-900 text-lg">iPhone 系統計時（做法 B）教學</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              因 iOS 安全限制，所有第三方瀏覽器（如 Chrome）在<strong>鎖定螢幕或切換 App</strong> 時都會凍結網頁運作。透過 iOS 原生「捷徑」，點擊按鈕即可一鍵啟動 iPhone 系統鬧鐘，<strong>就算手機鎖定放進口袋也能準時響鈴！</strong>
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> 10 秒簡單設定（只需做一次）：
              </h4>
              <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                <li>打開 iPhone 內建的<strong>「捷徑 (Shortcuts)」</strong>App。</li>
                <li>點右上角<strong>「＋」</strong>新增捷徑，將名稱命名為：<strong className="text-blue-700 bg-blue-100 px-1 py-0.5 rounded font-mono">巴士提醒</strong></li>
                <li>搜尋動作：<strong>「開始計時」</strong>（Timer）。</li>
                <li>點擊預設的時間，選<strong>「快捷方式輸入」</strong>，單位設為<strong>「分鐘」</strong>。</li>
                <li>點擊「完成」即可！</li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>若不設定捷徑：</strong>
                只要保持手機螢幕開啟停留在網頁上，本網頁支援<strong>實時路況自動校準</strong>，遇塞車或提早會自動更新時間，並在時間到時發出響亮鈴聲與震動！
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href="shortcuts://create-shortcut"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                開啟 iPhone「捷徑」App
              </a>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
