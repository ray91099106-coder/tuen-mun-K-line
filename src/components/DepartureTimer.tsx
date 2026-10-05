/**
 * DepartureTimer.tsx
 * Specialized timer for '往屯門' bus routes with iOS Shortcuts integration & Web Audio alarm.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Bell, Volume2, AlertTriangle, X, ExternalLink, HelpCircle, CheckCircle2, Play, Sparkles, Smartphone } from 'lucide-react';
import { playStartChime, playAlarmSound, stopAlarmSound, requestScreenWakeLock, releaseScreenWakeLock } from '../services/timerSound';

interface RouteArrivalInfo {
  route: string;
  minutes: number | null;
}

interface DepartureTimerProps {
  earliestRoute: string | null;
  earliestMinutes: number | null;
  availableRoutes?: RouteArrivalInfo[];
  selectedRouteTrigger?: { route: string; minutes: number } | null;
}

export const DepartureTimer: React.FC<DepartureTimerProps> = ({
  earliestRoute,
  earliestMinutes,
  availableRoutes = [],
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalInitialSeconds, setTotalInitialSeconds] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<string>('');
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showShortcutPromptModal, setShowShortcutPromptModal] = useState<boolean>(false);
  const [lastTriggerMode, setLastTriggerMode] = useState<'normal' | 'test'>('normal');

  const timerRef = useRef<number | null>(null);

  // Trigger iOS Shortcut URL scheme
  const triggerIosShortcut = (mins: number) => {
    try {
      const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent('巴士提醒')}&input=${mins}`;
      window.location.href = shortcutUrl;
    } catch (e) {
      console.warn('Could not launch shortcut url scheme', e);
    }
  };

  // Start web timer immediately without jumping out of browser
  const startTimer = (mins: number, route: string, isTest = false) => {
    const totalSecs = isTest ? 10 : Math.max(1, mins * 60);
    
    // Play user feedback chime and unlock audio on iOS Chrome
    playStartChime();
    requestScreenWakeLock();

    setActiveRoute(route || '往屯門');
    setTotalInitialSeconds(totalSecs);
    setRemainingSeconds(totalSecs);
    setIsRunning(true);
    setIsAlarmActive(false);
    setLastTriggerMode(isTest ? 'test' : 'normal');
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

  // Determine earliest target countdown
  const isEarliestOver8 = earliestMinutes !== null && earliestMinutes > 8;
  const targetCountdownMinutes = isEarliestOver8 && earliestMinutes !== null ? earliestMinutes - 8 : 0;

  // Filter other routes that are > 8 minutes for quick selection
  const otherRoutesOver8 = availableRoutes.filter(
    r => r.minutes !== null && r.minutes > 8 && r.route !== earliestRoute
  );

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
              className="w-full py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg shadow-red-200 transition-all cursor-pointer"
            >
              停止鬧鐘
            </button>
          </div>
        </div>
      )}

      {/* 2. Active Countdown Card (when running) */}
      {isRunning ? (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-4 shadow-lg border border-blue-400/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {lastTriggerMode === 'test' ? '⚡ 測試倒數進行中' : `⏳【${activeRoute}】出門提醒倒數中`}
              </span>
            </div>
            <button
              onClick={cancelTimer}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all cursor-pointer"
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
                {lastTriggerMode === 'test' ? '10 秒後將在手機響鈴' : '倒數結束時（距到站 8 分鐘）手機將發出響鈴'}
              </p>
            </div>
            
            <button
              onClick={() => setShowShortcutPromptModal(true)}
              className="px-3 py-2 bg-white text-blue-800 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
              title="同步到 iPhone 系統計時器以支援鎖定螢幕"
            >
              <Smartphone className="w-3.5 h-3.5" />
              iPhone 系統計時
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-blue-950/40 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="mt-2 text-[11px] text-blue-200/80 flex items-center justify-between">
            <span>✨ 螢幕防休眠保持開啟中，時間到時網頁會響鈴</span>
            <button 
              onClick={() => {
                playAlarmSound();
                setTimeout(() => stopAlarmSound(), 2000);
              }}
              className="underline hover:text-white"
            >
              測試聲音
            </button>
          </div>
        </div>
      ) : (
        /* 3. Permanent Departure Timer Panel */
        <div className={`rounded-2xl p-3 sm:p-4 border-2 transition-all ${
          isEarliestOver8 
            ? 'bg-amber-50/90 border-amber-400 shadow-sm' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${
                isEarliestOver8 ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    ⏱️ 往屯門出門提醒計時器
                  </span>
                  {isEarliestOver8 ? (
                    <span className="text-[11px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                      首班車 &gt; 8分鐘
                    </span>
                  ) : earliestMinutes !== null ? (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      首班車 ≤ 8分鐘 (即將抵達)
                    </span>
                  ) : null}
                </div>

                <div className="mt-0.5">
                  {isEarliestOver8 && earliestRoute ? (
                    <p className="text-sm font-black text-slate-800">
                      首班車【<span className="text-blue-700 font-black">{earliestRoute}</span>】預計 <span className="text-red-600 font-black">{earliestMinutes} 分鐘</span> 後到達。
                      <span className="font-normal text-xs text-slate-600 block sm:inline sm:ml-1">
                        點擊開始倒數 <strong className="text-amber-900 font-bold">{targetCountdownMinutes} 分鐘</strong>，於距到站 8 分鐘時響鈴出門！
                      </span>
                    </p>
                  ) : earliestMinutes !== null && earliestRoute ? (
                    <p className="text-xs text-slate-600">
                      首班車【<strong className="text-blue-700 font-bold">{earliestRoute}</strong>】約 <strong className="text-emerald-700 font-bold">{earliestMinutes} 分鐘</strong> 後到達（已少於8分鐘，可即時出門）。
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      正在獲取即時到站時間，你亦可隨時點擊「測試10秒」測試響鈴或設定計時。
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              {isEarliestOver8 && earliestRoute && (
                <button
                  onClick={() => startTimer(targetCountdownMinutes, earliestRoute, false)}
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

          {/* Secondary bar: Other routes over 8 mins & Test tone */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 flex-wrap">
              {otherRoutesOver8.length > 0 && (
                <>
                  <span className="text-[11px] font-bold text-slate-500">其他班次倒數：</span>
                  {otherRoutesOver8.map((r) => {
                    const cMins = (r.minutes ?? 0) - 8;
                    return (
                      <button
                        key={r.route}
                        onClick={() => startTimer(cMins, r.route, false)}
                        className="text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-blue-700 font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                      >
                        【{r.route}】{r.minutes}分 ➜ 倒數{cMins}分
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
                留在網頁倒數即可（螢幕常亮也會響鈴）
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
