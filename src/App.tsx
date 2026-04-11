/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, Clock, RefreshCw, MapPin, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, StopInfo } from './types';
import { fetchAllETA, STOPS } from './services/busService';

export default function App() {
  const [arrivals, setArrivals] = useState<Record<string, BusArrival[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isHomeOpen, setIsHomeOpen] = useState<boolean>(false);
  const [isKowloonOpen, setIsKowloonOpen] = useState<boolean>(false);
  const [isShenzhenOpen, setIsShenzhenOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestArea, setNearestArea] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const areas = [
      { name: '新墟(往置樂方向)', lat: 22.3983, lng: 113.9753 },
      { name: '屯門站(往置樂方向)', lat: 22.3946, lng: 113.9731 },
      { name: '市中心(往置樂方向)', lat: 22.3913, lng: 113.9755 },
      { name: '華都(往置樂方向)', lat: 22.3906, lng: 113.9789 }
    ];

    let minDistance = Infinity;
    let closest = null;

    areas.forEach(area => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, area.lat, area.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = area.name;
      }
    });

    setNearestArea(closest);
  }, [userLocation]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newArrivals = await fetchAllETA(STOPS);
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
      if (interval) clearInterval(interval);
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
        if (interval) clearInterval(interval);
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
  const kowloonStops = STOPS.filter(s => s.category === 'kowloon');
  const shenzhenStops = STOPS.filter(s => s.category === 'shenzhen');

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
    return { text: 'text-slate-900', border: 'border-slate-100' };
  };

  const getKowloonStyles = (mins: number | null) => {
    if (mins === null) return { text: 'text-slate-300', border: 'border-slate-100' };
    if (mins < 6) return { text: 'text-[#dc2626]', border: 'border-[#dc2626] border-2' }; // Red
    if (mins >= 6 && mins <= 9) return { text: 'text-[#16a34a]', border: 'border-[#16a34a] border-2' }; // Green
    if (mins > 9) return { text: 'text-[#808080]', border: 'border-slate-100' }; // Grey
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
                <span className="text-base font-black text-blue-700 leading-tight">{route}</span>
                <div className="mt-0.5">
                  {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
                  ) : arrival ? (
                    arrival.remainingMinutes !== null ? (
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-lg font-black leading-none ${styles.text}`}>
                          {arrival.remainingMinutes}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">{arrival.remark || '暫無'}</span>
                    )
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
                <span className="text-base font-black text-blue-700">{route}</span>
                <div>
                  {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
                  ) : arrival ? (
                    arrival.remainingMinutes !== null ? (
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-lg font-black ${styles.text}`}>
                          {arrival.remainingMinutes}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">{arrival.remark || '暫無'}</span>
                    )
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
      <div 
        onClick={() => {
          setIsHomeOpen(!isHomeOpen);
          if (!isHomeOpen) {
            setIsKowloonOpen(false);
            setIsShenzhenOpen(false);
          }
        }}
        className="w-full p-4 border-b border-slate-100 bg-orange-500 text-white flex items-center justify-between hover:bg-orange-600 transition-colors cursor-pointer"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bus className="w-5 h-5" />
          回家
        </h2>
        <div className="flex items-center gap-3">
          {isHomeOpen && <RefreshControl />}
          {isHomeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isHomeOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {(nearestArea && homeStopNames.includes(nearestArea) 
                ? [nearestArea, ...homeStopNames.filter(name => name !== nearestArea)] 
                : homeStopNames
              ).map((stopName) => {
                const stopsInGroup = homeStops.filter(s => s.name === stopName);
                const isNearest = nearestArea === stopName;
                
                // Calculate walking time to this area (approx 60m/min to account for non-straight paths)
                let walkingMins = 0;
                if (userLocation) {
                  const areaStop = stopsInGroup[0];
                  if (areaStop && areaStop.lat && areaStop.lng) {
                    const dist = calculateDistance(userLocation.lat, userLocation.lng, areaStop.lat, areaStop.lng);
                    walkingMins = Math.round(dist / 60);
                  }
                }

                return (
                  <div key={stopName} className={`space-y-1.5 p-2 rounded-xl transition-all ${isNearest ? 'bg-green-50 border-2 border-green-500' : ''}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-bold border-l-4 pl-2 ${isNearest ? 'border-green-600 text-green-700' : 'border-orange-500 text-slate-700'}`}>
                        {stopName.split('(')[0]} {isNearest && <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full ml-1 animate-pulse">最近</span>}
                      </h3>
                      {isNearest && walkingMins >= 0 && (
                        <span className="text-[10px] font-bold text-slate-500 mr-2">
                          {walkingMins === 0 ? '已到達巴士站' : `步程約 ${walkingMins} 分鐘`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {stopsInGroup.map((stop) => {
                        const arrival = arrivals[`${stop.id}-${stop.route}`]?.find(a => a.route === stop.route);
                        const styles = getHomeStyles(arrival?.remainingMinutes ?? null);
                        
                        // Check if can catch: walkingMins <= remainingMinutes <= walkingMins + 3
                        const canCatch = arrival && 
                                        arrival.remainingMinutes !== null && 
                                        arrival.remainingMinutes >= walkingMins && 
                                        arrival.remainingMinutes <= walkingMins + 3;

                        return (
                          <div key={`${stop.id}-${stop.route}`} className={`bg-white border rounded-xl p-3 flex flex-col items-center shadow-sm transition-all ${canCatch ? 'border-green-500 border-2 ring-2 ring-green-100' : styles.border}`}>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-base font-black text-blue-700 leading-tight tracking-tight">{stop.route}</span>
                              {canCatch && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />}
                            </div>
                            <div className="flex items-baseline gap-1">
                              {loading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                                <div className="w-6 h-4 bg-slate-200 animate-pulse rounded" />
                              ) : arrival ? (
                                arrival.remainingMinutes !== null ? (
                                  <>
                                    <span className={`text-base font-black leading-none ${styles.text}`}>
                                      {arrival.remainingMinutes}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">{arrival.remark || '暫無'}</span>
                                )
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

  const renderKowloonSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div 
        onClick={() => {
          setIsKowloonOpen(!isKowloonOpen);
          if (!isKowloonOpen) {
            setIsHomeOpen(false);
            setIsShenzhenOpen(false);
          }
        }}
        className="w-full p-4 border-b border-slate-100 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700 transition-colors cursor-pointer"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          出九龍
        </h2>
        <div className="flex items-center gap-3">
          {isKowloonOpen && <RefreshControl />}
          {isKowloonOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isKowloonOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold border-l-4 border-teal-600 pl-2 text-slate-700">
                  香港黃金海岸 (Gold Coast)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {kowloonStops.map((stop) => {
                    const stopArrivals = arrivals[`${stop.id}-${stop.route}`] || [];
                    const displayArrivals = stopArrivals.slice(0, 2);
                    const firstArrival = displayArrivals[0];
                    const styles = getKowloonStyles(firstArrival?.remainingMinutes ?? null);

                    return (
                      <div key={`${stop.id}-${stop.route}`} className={`bg-slate-50 border rounded-xl p-3 flex flex-col items-center shadow-sm transition-all ${styles.border}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-base font-black text-blue-700 leading-tight tracking-tight">{stop.route}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 w-full">
                          {loading && stopArrivals.length === 0 ? (
                            <div className="w-12 h-6 bg-slate-200 animate-pulse rounded" />
                          ) : displayArrivals.length > 0 ? (
                            displayArrivals.map((arrival, idx) => (
                              <div key={idx} className={`flex items-baseline gap-1 ${idx === 0 ? '' : 'opacity-60 border-t border-slate-200 w-full justify-center pt-1 mt-1'}`}>
                                {arrival.remainingMinutes !== null ? (
                                  <>
                                    <span className={`${idx === 0 ? 'text-base' : 'text-sm'} font-black leading-none ${idx === 0 ? styles.text : 'text-slate-500'}`}>
                                      {arrival.remainingMinutes}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">{arrival.remark || '暫無'}</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold italic">暫無</span>
                          )}
                        </div>
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
  );

  const renderShenzhenSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div 
        onClick={() => {
          setIsShenzhenOpen(!isShenzhenOpen);
          if (!isShenzhenOpen) {
            setIsHomeOpen(false);
            setIsKowloonOpen(false);
          }
        }}
        className="w-full p-4 border-b border-slate-100 bg-[#7700BB] text-white flex items-center justify-between hover:bg-[#6600AA] transition-colors cursor-pointer"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          深圳灣口岸
        </h2>
        <div className="flex items-center gap-3">
          {isShenzhenOpen && <RefreshControl />}
          {isShenzhenOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isShenzhenOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold border-l-4 border-[#7700BB] pl-2 text-slate-700">
                  深圳灣口岸總站 (Shenzhen Bay Port)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {shenzhenStops.map((stop) => {
                    const stopArrivals = arrivals[`${stop.id}-${stop.route}`] || [];
                    const displayArrivals = stopArrivals.slice(0, 2);
                    const firstArrival = displayArrivals[0];
                    const styles = getKowloonStyles(firstArrival?.remainingMinutes ?? null);

                    return (
                      <div key={`${stop.id}-${stop.route}`} className={`bg-slate-50 border rounded-xl p-3 flex flex-col items-center shadow-sm transition-all ${styles.border}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-base font-black text-blue-700 leading-tight tracking-tight">{stop.route}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 w-full">
                          {loading && stopArrivals.length === 0 ? (
                            <div className="w-12 h-6 bg-slate-200 animate-pulse rounded" />
                          ) : displayArrivals.length > 0 ? (
                            displayArrivals.map((arrival, idx) => (
                              <div key={idx} className={`flex items-baseline gap-1 ${idx === 0 ? '' : 'opacity-60 border-t border-slate-200 w-full justify-center pt-1 mt-1'}`}>
                                {arrival.remainingMinutes !== null ? (
                                  <>
                                    <span className={`${idx === 0 ? 'text-base' : 'text-sm'} font-black leading-none ${idx === 0 ? styles.text : 'text-slate-500'}`}>
                                      {arrival.remainingMinutes}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">{arrival.remark || '暫無'}</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold italic">暫無</span>
                          )}
                        </div>
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
        {isShenzhenOpen ? (
          <>
            {renderShenzhenSection()}
            {renderKowloonSection()}
            {renderHomeSection()}
            {renderPinnedSection()}
          </>
        ) : isKowloonOpen ? (
          <>
            {renderKowloonSection()}
            {renderShenzhenSection()}
            {renderHomeSection()}
            {renderPinnedSection()}
          </>
        ) : isHomeOpen ? (
          <>
            {renderHomeSection()}
            {renderKowloonSection()}
            {renderShenzhenSection()}
            {renderPinnedSection()}
          </>
        ) : (
          <>
            {renderPinnedSection()}
            {renderHomeSection()}
            {renderKowloonSection()}
            {renderShenzhenSection()}
          </>
        )}

      </div>
    </div>
  );
}
