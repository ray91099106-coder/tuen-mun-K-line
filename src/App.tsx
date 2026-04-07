/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, Clock, RefreshCw, MapPin, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, StopInfo } from './types';
import { fetchETA, STOPS } from './services/busService';

export default function App() {
  const [arrivals, setArrivals] = useState<Record<string, BusArrival[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isHomeOpen, setIsHomeOpen] = useState<boolean>(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(STOPS.map(stop => fetchETA(stop)));
      const newArrivals: Record<string, BusArrival[]> = {};
      STOPS.forEach((stop, index) => {
        newArrivals[`${stop.id}-${stop.route}`] = results[index];
      });
      setArrivals(newArrivals);
      setLastUpdated(new Date());
    } catch (err) {
      setError('無法獲取到站時間，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    
    let interval: ReturnType<typeof setInterval>;

    const startTimer = () => {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshAll();
        }
      }, 30000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAll(); // Refresh immediately when coming back
        startTimer();
      } else {
        clearInterval(interval);
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAll]);

  const pinnedStops = STOPS.filter(s => s.category === 'pinned');
  const homeStops = STOPS.filter(s => s.category === 'home');

  // Group home stops by virtual stop name
  const homeStopNames = ['新墟(往置樂方向)', '屯門站(往置樂方向)', '市中心(往置樂方向)', '華都(往置樂方向)'];

  const getPinnedStyles = (mins: number | null) => {
    if (mins === null) return { text: 'text-slate-300', border: 'border-slate-100' };
    if (mins >= 0 && mins <= 7) return { text: 'text-[#dc2626]', border: 'border-[#dc2626] border-2' }; // Red
    if (mins > 7 && mins <= 9) return { text: 'text-[#16a34a]', border: 'border-[#16a34a] border-2' }; // Green
    if (mins > 9) return { text: 'text-[#808080]', border: 'border-slate-100' }; // Grey
    return { text: 'text-slate-900', border: 'border-slate-100' };
  };

  const getHomeStyles = (mins: number | null) => {
    if (mins === null) return { text: 'text-slate-300', border: 'border-slate-100' };
    if (mins >= 1 && mins <= 2) return { text: 'text-[#dc2626]', border: 'border-[#dc2626] border-2' }; // Red
    if (mins >= 3 && mins <= 5) return { text: 'text-[#16a34a]', border: 'border-[#16a34a] border-2' }; // Green
    if (mins > 5) return { text: 'text-[#808080]', border: 'border-slate-100' }; // Grey
    return { text: 'text-slate-900', border: 'border-slate-100' };
  };

  const RefreshControl = () => (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-[9px] uppercase font-bold opacity-80">最後更新</p>
        <p className="text-xs font-mono font-bold">{lastUpdated.toLocaleTimeString()}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          refreshAll();
        }}
        disabled={loading}
        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all active:scale-90 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  const renderPinnedSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-blue-600 text-white flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          往屯門
        </h2>
        {!isHomeOpen ? <RefreshControl /> : <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">置頂路線</span>}
      </div>
      <div className="p-4 space-y-4">
        {/* Row 1: MTRB K-Routes */}
        <div className="grid grid-cols-3 gap-2">
          {['K51', 'K53', 'K51A'].map(route => {
            const stop = pinnedStops.find(s => s.route === route);
            const arrival = stop ? arrivals[`${stop.id}-${stop.route}`]?.find(a => a.route === route) : null;
            const styles = getPinnedStyles(arrival?.remainingMinutes ?? null);
            
            return (
              <div key={route} className={`flex flex-col items-center p-2 bg-slate-50 rounded-xl border shadow-sm transition-all ${styles.border}`}>
                <span className="text-sm font-black text-blue-700">{route}</span>
                <div className="mt-1">
                  {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
                  ) : arrival ? (
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-lg font-black ${styles.text}`}>
                        {arrival.remainingMinutes}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold italic">暫無</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2: KMB Routes */}
        <div className="grid grid-cols-2 gap-2">
          {['61M', '52X'].map(route => {
            const stop = pinnedStops.find(s => s.route === route);
            const arrival = stop ? arrivals[`${stop.id}-${stop.route}`]?.find(a => a.route === route) : null;
            const styles = getPinnedStyles(arrival?.remainingMinutes ?? null);

            return (
              <div key={route} className={`flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl border shadow-sm transition-all ${styles.border}`}>
                <span className="text-sm font-black text-blue-700">{route}</span>
                <div>
                  {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
                  ) : arrival ? (
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-lg font-black ${styles.text}`}>
                        {arrival.remainingMinutes}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold italic">暫無</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderHomeSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsHomeOpen(!isHomeOpen)}
        className="w-full p-4 border-b border-slate-100 bg-orange-500 text-white flex items-center justify-between hover:bg-orange-600 transition-colors"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bus className="w-5 h-5" />
          回家
        </h2>
        <div className="flex items-center gap-3">
          {isHomeOpen && <RefreshControl />}
          {isHomeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      
      <AnimatePresence>
        {isHomeOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {homeStopNames.map((stopName) => {
                const stopsInGroup = homeStops.filter(s => s.name === stopName);
                return (
                  <div key={stopName} className="space-y-1.5">
                    <h3 className="text-sm font-bold border-l-4 border-orange-500 pl-2 text-slate-700">
                      {stopName.split('(')[0]}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {stopsInGroup.map((stop) => {
                        const arrival = arrivals[`${stop.id}-${stop.route}`]?.find(a => a.route === stop.route);
                        const styles = getHomeStyles(arrival?.remainingMinutes ?? null);

                        return (
                          <div key={`${stop.id}-${stop.route}`} className={`bg-slate-50 border rounded-xl p-1.5 flex flex-col items-center shadow-sm transition-all ${styles.border}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm font-black text-blue-700">{stop.route}</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                                <div className="w-6 h-4 bg-slate-200 animate-pulse rounded" />
                              ) : arrival ? (
                                <>
                                  <span className={`text-base font-black ${styles.text}`}>
                                    {arrival.remainingMinutes}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold italic">暫無</span>
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Stay on Top Logic */}
        {isHomeOpen ? (
          <>
            {renderHomeSection()}
            {renderPinnedSection()}
          </>
        ) : (
          <>
            {renderPinnedSection()}
            {renderHomeSection()}
          </>
        )}

      </div>
    </div>
  );
}
