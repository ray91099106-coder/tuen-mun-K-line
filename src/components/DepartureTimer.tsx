/**
 * DepartureTimer.tsx
 * Specialized timer for '往屯門' bus routes with iOS Shortcuts integration & Web Audio alarm.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Bell, Volume2, AlertTriangle, X, ExternalLink, HelpCircle, CheckCircle2, Play } from 'lucide-react';
import { playStartChime, playAlarmSound, stopAlarmSound, requestScreenWakeLock, releaseScreenWakeLock } from '../services/timerSound';

interface DepartureTimerProps {
  earliestRoute: string | null;
  earliestMinutes: number | null;
}

export const DepartureTimer: React.FC<DepartureTimerProps> = ({ earliestRoute, earliestMinutes }) => {
  // Target bus arrival minutes (e.g. 14 min)
  // Alarm triggers when bus reaches 8 min, so countdown duration = earliestMinutes - 8
  const targetCountdownMinutes = earliestMinutes !== null && earliestMinutes > 8 ? earliestMinutes - 8 : 0;

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalInitialSeconds, setTotalInitialSeconds] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<string>('');
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [lastTriggerMode, setLastTriggerMode] = useState<'normal' | 'test'>('normal');

  const timerRef = useRef<number | null>(null);

  // Trigger iOS Shortcut URL scheme
  const triggerIosShortcut = (mins: number) => {
    try {
      // Shortcuts URL scheme passing minutes as input parameter
      // Name: '巴士提醒'
      const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent('巴士提醒')}&input=${mins}`;
      window.location.href = shortcutUrl;
    } catch (e) {
      console.warn('Could not launch shortcut url scheme', e);
    }
  };

  const startTimer = (mins: number, route: string, isTest = false) => {
    const totalSecs = isTest ? 10 : Math.max(1, mins * 60);
    
    // Play user feedback chime and unlock audio on iOS Chrome
    playStartChime();
    requestScreenWakeLock();

    setActiveRoute(route);
    setTotalInitialSeconds(totalSecs);
    setRemainingSeconds(totalSecs);
    setIsRunning(true);
    setIsAlarmActive(false);
    setLastTriggerMode(isTest ? 'test' : 'normal');

    if (!isTest) {
      // Try opening iOS Shortcut simultaneously
      triggerIosShortcut(mins);
    }
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setRemainingSeconds(0);
    releaseScreenWakeLock();
    stopAlarmSound();
    setIsAlarmActive(false);
  };

  const stopAlarm = () => {
    stopAlarmSound();
    setIsAlarmActive(false);
    setIsRunning(false);
    releaseScreenWakeLock();
  };

  // Timer countdown loop
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRunning(false);
            setIsAlarmActive(true);
            playAlarmSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, remainingSeconds]);

  // Clean up wake lock and sound when unmounted
  useEffect(() => {
    return () => {
      releaseScreenWakeLock();
      stopAlarmSound();
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalInitialSeconds > 0 
    ? Math.max(0, Math.min(100, ((totalInitialSeconds - remainingSeconds) / totalInitialSeconds) * 100))
    : 0;

  return (
    <>
      {/* 1. Alarm Alert Modal (when timer finishes) */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-red-500 animate-bounce">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Bell className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">🔔 時間到！請出門！</h3>
            <p className="text-slate-600 text-sm mb-6">
              {lastTriggerMode === 'test' ? (
                <>測試倒數已完成！響鈴功能正常運作。</>
              ) : (
                <>
                  往屯門首班車【<strong className="text-blue-600 font-black">{activeRoute}</strong>】預計還有約 <strong className="text-red-600 font-black">8 分鐘</strong> 抵達！
                </>
              )}
            </p>
            <button
              onClick={stopAlarm}
              className="w-full py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg shadow-red-200 transition-all"
            >
              停止鬧鐘
            </button>
          </div>
        </div>
      )}

      {/* 2. Active Countdown Card (when running) */}
      {isRunning && (
        <div className="mb-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-4 shadow-lg border border-blue-400/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {lastTriggerMode === 'test' ? '測試倒數進行中' : `【${activeRoute}】出門提醒倒數中`}
              </span>
            </div>
            <button
              onClick={cancelTimer}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all"
            >
              <X className="w-3.5 h-3.5" /> 取消
            </button>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-4xl font-black font-mono tracking-tight text-white drop-shadow">
                {formatTime(remainingSeconds)}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {lastTriggerMode === 'test' ? '10秒後測試響鈴' : '倒數完畢時（距到站8分鐘）手機將會響鈴'}
              </p>
            </div>
            
            <button
              onClick={() => triggerIosShortcut(Math.ceil(remainingSeconds / 60))}
              className="px-3 py-2 bg-white text-blue-800 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:bg-blue-50 active:scale-95 transition-all"
              title="喚醒 iPhone 系統計時器以支援鎖定螢幕"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              iPhone 原生計時
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-blue-950/40 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Timer Prompt Button (visible when earliest arrival > 8 mins and not currently running) */}
      {!isRunning && targetCountdownMinutes > 0 && earliestRoute && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-amber-950">
                    首班車【{earliestRoute}】{earliestMinutes} 分鐘後到達
                  </h3>
                  <span className="text-[11px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                    大於 8 分鐘
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  建議倒數 <strong className="text-amber-950 font-black">{targetCountdownMinutes} 分鐘</strong>，於到站前 8 分鐘響鈴出門。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => startTimer(targetCountdownMinutes, earliestRoute, false)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                設定 {targetCountdownMinutes} 分鐘倒數
              </button>

              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2.5 text-amber-800 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl transition-all"
                title="iOS 原生計時器設定教學"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick test buttons toolbar */}
          <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-800">
            <span className="text-[11px] text-amber-700 font-medium">
              💡 支援 iOS Chrome 鎖定螢幕（搭配捷徑）或螢幕長亮即時鈴聲
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => startTimer(0, earliestRoute, true)}
                className="text-[11px] text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-2 py-1 rounded font-bold transition-all"
              >
                ⚡ 測試10秒
              </button>
              <button
                onClick={() => {
                  playStartChime();
                  setTimeout(() => playAlarmSound(), 300);
                  setTimeout(() => stopAlarmSound(), 3000);
                }}
                className="text-[11px] text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-2 py-1 rounded font-bold transition-all flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" /> 試聽鈴聲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. iOS Shortcuts Setup Instructions Modal */}
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
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
                只要保持手機螢幕開啟停留在網頁上，本網頁也會在時間到時發出響亮鈴聲與震動！
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
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
