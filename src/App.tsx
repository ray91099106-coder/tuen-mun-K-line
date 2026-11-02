/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, Clock, RefreshCw, MapPin, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BusArrival, StopInfo } from './types';
import { fetchAllETA, STOPS } from './services/busService';
import { DepartureTimer } from './components/DepartureTimer';

export default function App() {
  const [arrivals, setArrivals] = useState<Record<string, BusArrival[]>>(() => {
    try {
      const cached = localStorage.getItem('cached_bus_arrivals');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return {};
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('cached_bus_arrivals');
    } catch (e) {
      return true;
    }
  });
  const [pinnedLoading, setPinnedLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('cached_bus_arrivals');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Object.keys(parsed).some(k => k.includes('K51') || k.includes('61M'))) {
          return false;
        }
      }
    } catch (e) {}
    return true;
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPinnedOpen, setIsPinnedOpen] = useState<boolean>(true);
  const [isHomeOpen, setIsHomeOpen] = useState<boolean>(false);
  const [isKowloonOpen, setIsKowloonOpen] = useState<boolean>(false);
  const [isShenzhenOpen, setIsShenzhenOpen] = useState<boolean>(false);
  const [isHuanggangOpen, setIsHuanggangOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestArea, setNearestArea] = useState<string | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);
  const [timerTrigger, setTimerTrigger] = useState<{ 
    route: string; 
    minutes: number; 
    isNextBus?: boolean; 
    originalMinutes?: number; 
    timestamp: number 
  } | null>(null);
  const [activeTimerRoute, setActiveTimerRoute] = useState<string | null>(null);
  const [leadMinutes, setLeadMinutes] = useState<number>(() => {
    try {
      const version = localStorage.getItem('bus_reminder_lead_version_tm');
      if (version !== '2') {
        localStorage.setItem('bus_reminder_lead_version_tm', '2');
        localStorage.setItem('bus_reminder_lead_minutes', '9');
        return 9;
      }
      const saved = localStorage.getItem('bus_reminder_lead_minutes');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([8, 9, 10].includes(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return 9;
  });

  const [kowloonLeadMinutes, setKowloonLeadMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bus_reminder_lead_minutes_kowloon');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([6, 7, 8].includes(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return 7; // Default is 7 minutes for Kowloon
  });

  const handleTriggerRouteTimer = (route: string, clickedArrivalMinutes?: number | null) => {
    const stop = pinnedStops.find(s => s.route === route);
    const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [] : [];
    const first = routeArrivals[0];

    // Ensure 往屯門 section is expanded
    setIsPinnedOpen(true);
    setIsHomeOpen(false);
    setIsKowloonOpen(false);
    setIsShenzhenOpen(false);
    setIsHuanggangOpen(false);

    // If caller explicitly clicked a minute that is > leadMinutes, use it
    if (clickedArrivalMinutes !== undefined && clickedArrivalMinutes !== null && clickedArrivalMinutes > leadMinutes) {
      const isNextBus = first && clickedArrivalMinutes !== first.remainingMinutes;
      setTimerTrigger({
        route,
        minutes: clickedArrivalMinutes,
        isNextBus,
        originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
        timestamp: Date.now(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Otherwise, check if first arrival <= leadMinutes:
    // If so, automatically find the next catchable arrival (> leadMinutes)!
    const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

    if (catchable && catchable.remainingMinutes !== null) {
      const isNextBus = catchable !== first;
      setTimerTrigger({
        route,
        minutes: catchable.remainingMinutes,
        isNextBus,
        originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
        timestamp: Date.now(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (first && first.remainingMinutes !== null) {
      // If all arrivals are <= leadMinutes (impossible to catch)
      setTimerTrigger({
        route,
        minutes: first.remainingMinutes,
        isNextBus: false,
        timestamp: Date.now(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [kowloonTimerTrigger, setKowloonTimerTrigger] = useState<{ 
    route: string; 
    minutes: number; 
    isNextBus?: boolean; 
    originalMinutes?: number; 
    timestamp: number 
  } | null>(null);
  const [activeKowloonTimerRoute, setActiveKowloonTimerRoute] = useState<string | null>(null);

  const handleTriggerKowloonRouteTimer = (route: string, clickedArrivalMinutes?: number | null) => {
    const stop = kowloonStops.find(s => s.route === route);
    const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [] : [];
    const first = routeArrivals[0];

    // Ensure Kowloon section is expanded
    setIsKowloonOpen(true);
    setIsPinnedOpen(false);
    setIsHomeOpen(false);
    setIsShenzhenOpen(false);
    setIsHuanggangOpen(false);

    // If caller explicitly clicked a minute that is > kowloonLeadMinutes, use it
    if (clickedArrivalMinutes !== undefined && clickedArrivalMinutes !== null && clickedArrivalMinutes > kowloonLeadMinutes) {
      const isNextBus = first && clickedArrivalMinutes !== first.remainingMinutes;
      setKowloonTimerTrigger({
        route,
        minutes: clickedArrivalMinutes,
        isNextBus,
        originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
        timestamp: Date.now(),
      });
      return;
    }

    // Otherwise, check if first arrival <= kowloonLeadMinutes:
    // If so, automatically find the next catchable arrival (> kowloonLeadMinutes)!
    const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > kowloonLeadMinutes);

    if (catchable && catchable.remainingMinutes !== null) {
      const isNextBus = catchable !== first;
      setKowloonTimerTrigger({
        route,
        minutes: catchable.remainingMinutes,
        isNextBus,
        originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
        timestamp: Date.now(),
      });
    } else if (first && first.remainingMinutes !== null) {
      // If all arrivals are <= kowloonLeadMinutes (impossible to catch)
      setKowloonTimerTrigger({
        route,
        minutes: first.remainingMinutes,
        isNextBus: false,
        timestamp: Date.now(),
      });
    }
  };

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
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;

    // Suppress uncatchable browser geolocation errors from bubbling up to the preview overlay
    const errorHandler = (e: ErrorEvent) => {
      if (e.message && e.message.toLowerCase().includes('geolocation')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setLocationError(null);
      }
    };
    
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      if (e.reason && String(e.reason.message || e.reason).toLowerCase().includes('geolocation')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setLocationError(null);
      }
    };

    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler, true);

    const startWatching = () => {
      if (watchId !== null) return;
      try {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            try {
              if (position?.coords) {
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
                setLocationError(null);
              }
            } catch (e) {
              // Ignore
            }
          },
          (error) => {
            // Stop watching if position is unavailable to prevent continuous browser error events
            if (watchId !== null && (error?.code === 2 || error?.code === 1)) {
              try {
                navigator.geolocation.clearWatch(watchId);
              } catch (e) {}
              watchId = null;
            }
            if (error?.code === 1) {
              setLocationError('請允許位置存取權限以啟用步程計算功能。');
            } else {
              setLocationError(null);
            }
          },
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 8000 }
        );
      } catch (err) {
        // Suppress
      }
    };

    const stopWatching = () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (e) {}
        watchId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startWatching();
      } else {
        stopWatching();
      }
    };

    if (document.visibilityState === 'visible') {
      startWatching();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopWatching();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler, true);
    };
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
    let shouldAutoOpen = false;

    areas.forEach(area => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, area.lat, area.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = area.name;
      }

      // Check if any station is within 10 minutes walking dist (approx 600m)
      if (!hasAutoOpened && Math.round(dist / 60) <= 10) {
        shouldAutoOpen = true;
      }
    });

    setNearestArea(closest);

    if (shouldAutoOpen && !hasAutoOpened) {
      setIsHomeOpen(true);
      setIsPinnedOpen(false);
      setIsKowloonOpen(false);
      setIsShenzhenOpen(false);
      setIsHuanggangOpen(false);
      setHasAutoOpened(true);
    }
  }, [userLocation, hasAutoOpened]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newArrivals = await fetchAllETA(STOPS, (partialArrivals) => {
        setArrivals(prev => {
          const merged = { ...prev, ...partialArrivals };
          try {
            localStorage.setItem('cached_bus_arrivals', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
        // Clear pinnedLoading as soon as pinned arrivals are received
        if (Object.keys(partialArrivals).some(k => k.includes('K51') || k.includes('61M') || k.includes('52X'))) {
          setPinnedLoading(false);
        }
      });
      setArrivals(newArrivals);
      setLastUpdated(new Date());
      try {
        localStorage.setItem('cached_bus_arrivals', JSON.stringify(newArrivals));
      } catch (e) {}
    } catch (err) {
      setError('無法獲取到站時間，請稍後再試。');
    } finally {
      setLoading(false);
      setPinnedLoading(false);
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
  const huanggangToStops = STOPS.filter(s => s.category === 'huanggang' && s.subCategory === 'to_port');
  const huanggangFromStops = STOPS.filter(s => s.category === 'huanggang' && s.subCategory === 'from_port');

  // Find earliest catchable arrival (> leadMinutes) among pinned routes ('往屯門')
  const earliestPinnedArrival = useMemo(() => {
    let best: { route: string; minutes: number; isNextBus: boolean } | null = null;
    const targetRoutes = ['K51', 'K53', 'K51A', '61M', '52X'];

    // 1. Look for first arrival that is catchable (> leadMinutes)
    for (const route of targetRoutes) {
      const stop = pinnedStops.find(s => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
      if (routeArrivals.length === 0) continue;

      const first = routeArrivals[0];
      const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNextBus = catchable !== first;
        if (!best || catchable.remainingMinutes < best.minutes) {
          best = { route, minutes: catchable.remainingMinutes, isNextBus };
        }
      }
    }

    // 2. Fallback: if all current buses are <= leadMinutes
    if (!best) {
      for (const route of targetRoutes) {
        const stop = pinnedStops.find(s => s.route === route);
        if (!stop) continue;
        const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
        const first = routeArrivals[0];
        if (first && first.remainingMinutes !== null && first.remainingMinutes >= 0) {
          if (!best || first.remainingMinutes < best.minutes) {
            best = { route, minutes: first.remainingMinutes, isNextBus: false };
          }
        }
      }
    }

    return best;
  }, [arrivals, pinnedStops, leadMinutes]);

  // All pinned route arrivals for quick timers (automatically targets next bus if first <= leadMinutes)
  const allPinnedRouteArrivals = useMemo(() => {
    const list: { route: string; minutes: number | null; firstMinutes?: number | null; isNextBus?: boolean }[] = [];
    const targetRoutes = ['K51', 'K53', 'K51A', '61M', '52X'];
    for (const route of targetRoutes) {
      const stop = pinnedStops.find(s => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
      if (routeArrivals.length === 0) {
        list.push({ route, minutes: null });
        continue;
      }

      const first = routeArrivals[0];
      const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNext = catchable !== first;
        list.push({
          route,
          minutes: catchable.remainingMinutes,
          firstMinutes: first?.remainingMinutes ?? null,
          isNextBus: isNext,
        });
      } else {
        list.push({
          route,
          minutes: first?.remainingMinutes ?? null,
          firstMinutes: first?.remainingMinutes ?? null,
          isNextBus: false,
        });
      }
    }
    return list;
  }, [arrivals, pinnedStops, leadMinutes]);

  // Find earliest catchable arrival (> kowloonLeadMinutes) among kowloon routes ('出九龍')
  const earliestKowloonArrival = useMemo(() => {
    let best: { route: string; minutes: number; isNextBus: boolean } | null = null;
    const targetRoutes = ['61M', '52X', '140M', '952'];

    // 1. Look for first arrival that is catchable (> kowloonLeadMinutes)
    for (const route of targetRoutes) {
      const stop = kowloonStops.find(s => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
      if (routeArrivals.length === 0) continue;

      const first = routeArrivals[0];
      const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > kowloonLeadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNextBus = catchable !== first;
        if (!best || catchable.remainingMinutes < best.minutes) {
          best = { route, minutes: catchable.remainingMinutes, isNextBus };
        }
      }
    }

    // 2. Fallback: if all current buses are <= kowloonLeadMinutes
    if (!best) {
      for (const route of targetRoutes) {
        const stop = kowloonStops.find(s => s.route === route);
        if (!stop) continue;
        const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
        const first = routeArrivals[0];
        if (first && first.remainingMinutes !== null && first.remainingMinutes >= 0) {
          if (!best || first.remainingMinutes < best.minutes) {
            best = { route, minutes: first.remainingMinutes, isNextBus: false };
          }
        }
      }
    }

    return best;
  }, [arrivals, kowloonStops, kowloonLeadMinutes]);

  // All Kowloon route arrivals for quick timers (automatically targets next bus if first <= kowloonLeadMinutes)
  const allKowloonRouteArrivals = useMemo(() => {
    const list: { route: string; minutes: number | null; firstMinutes?: number | null; isNextBus?: boolean }[] = [];
    const targetRoutes = ['61M', '52X', '140M', '952'];
    for (const route of targetRoutes) {
      const stop = kowloonStops.find(s => s.route === route);
      if (!stop) continue;
      const routeArrivals = arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [];
      if (routeArrivals.length === 0) {
        list.push({ route, minutes: null });
        continue;
      }

      const first = routeArrivals[0];
      const catchable = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > kowloonLeadMinutes);

      if (catchable && catchable.remainingMinutes !== null) {
        const isNext = catchable !== first;
        list.push({
          route,
          minutes: catchable.remainingMinutes,
          firstMinutes: first?.remainingMinutes ?? null,
          isNextBus: isNext,
        });
      } else {
        list.push({
          route,
          minutes: first?.remainingMinutes ?? null,
          firstMinutes: first?.remainingMinutes ?? null,
          isNextBus: false,
        });
      }
    }
    return list;
  }, [arrivals, kowloonStops, kowloonLeadMinutes]);

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
      <div 
        onClick={() => {
          const next = !isPinnedOpen;
          setIsPinnedOpen(next);
          if (next) {
            setIsHomeOpen(false);
            setIsKowloonOpen(false);
            setIsShenzhenOpen(false);
            setIsHuanggangOpen(false);
          }
        }}
        className="w-full p-4 border-b border-slate-100 bg-blue-600 text-white flex items-center justify-between hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          往屯門
        </h2>
        <div className="flex items-center gap-3">
          {isPinnedOpen && <RefreshControl />}
          {isPinnedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      <AnimatePresence initial={false}>
        {isPinnedOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
        {/* Departure Timer Widget for 往屯門 */}
        <DepartureTimer
          title="往屯門出門提醒計時器"
          targetDestination="往屯門"
          earliestRoute={earliestPinnedArrival?.route ?? null}
          earliestMinutes={earliestPinnedArrival?.minutes ?? null}
          earliestIsNextBus={earliestPinnedArrival?.isNextBus}
          availableRoutes={allPinnedRouteArrivals}
          selectedRouteTrigger={timerTrigger}
          onActiveRouteChange={setActiveTimerRoute}
          leadMinutes={leadMinutes}
          onLeadMinutesChange={setLeadMinutes}
          leadMinutesOptions={[8, 9, 10]}
          recommendedLeadMinutes={9}
          storageKey="bus_reminder_lead_minutes"
          onRefresh={refreshAll}
          isRefreshing={pinnedLoading && loading}
          lastUpdated={lastUpdated}
        />

        {/* Row 1: MTRB K-Routes */}
        <div className="grid grid-cols-3 gap-2">
          {['K51', 'K53', 'K51A'].map(route => {
            const stop = pinnedStops.find(s => s.route === route);
            const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [] : [];
            const arrival = routeArrivals[0] || null;
            const nextArrival = routeArrivals[1] || null;
            const styles = getPinnedStyles(arrival?.remainingMinutes ?? null);
            const isThisRouteActive = activeTimerRoute === route;
            const hasValidArrival = arrival?.remainingMinutes !== null && arrival?.remainingMinutes !== undefined;

            const firstIsUncatchable = hasValidArrival && (arrival?.remainingMinutes ?? 0) <= leadMinutes;
            const catchableNext = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

            return (
              <div 
                key={route} 
                onClick={() => {
                  if (hasValidArrival) {
                    handleTriggerRouteTimer(route, null);
                  }
                }}
                className={`flex flex-col items-center p-2 rounded-xl border shadow-sm transition-all select-none ${
                  isThisRouteActive 
                    ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400 shadow-md' 
                    : hasValidArrival
                    ? 'bg-slate-50 hover:bg-blue-50/70 hover:border-blue-400 hover:shadow cursor-pointer active:scale-95'
                    : 'bg-slate-50'
                } ${styles.border}`}
                title={
                  hasValidArrival
                    ? firstIsUncatchable && catchableNext
                      ? `首班車（${arrival?.remainingMinutes}分）少於提前提醒時間趕不上，點擊自動為下班車（${catchableNext.remainingMinutes}分）倒數`
                      : `點擊為【${route}】到站時間（${arrival?.remainingMinutes}分）開始出門倒數`
                    : route
                }
              >
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-blue-700 leading-tight">{route}</span>
                  {isThisRouteActive && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </div>

                <div className="mt-0.5 w-full">
                  {pinnedLoading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded mx-auto" />
                  ) : arrival ? (
                    arrival.remainingMinutes !== null ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black leading-none ${styles.text}`}>
                            {arrival.remainingMinutes}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                        </div>

                        {/* Interactive Countdown Indicator / Button */}
                        <div className="mt-1">
                          {isThisRouteActive ? (
                            <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs animate-pulse">
                              <Clock className="w-2.5 h-2.5" /> 倒數中
                            </span>
                          ) : firstIsUncatchable && catchableNext ? (
                            <span className="text-[9px] bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer border border-amber-300">
                              ⏱️ 下班{catchableNext.remainingMinutes}分
                            </span>
                          ) : (
                            <span className="text-[9px] bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer">
                              ⏱️ 計時
                            </span>
                          )}
                        </div>

                        {/* Next Arrival (Clickable for 2nd bus timer) */}
                        {nextArrival && nextArrival.remainingMinutes !== null && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerRouteTimer(route, nextArrival.remainingMinutes);
                            }}
                            className="flex items-baseline justify-center gap-0.5 border-t border-slate-200/90 w-full pt-1 mt-1 hover:bg-blue-100/70 rounded transition-all cursor-pointer"
                            title={`點擊為下班【${route}】（${nextArrival.remainingMinutes}分）計時`}
                          >
                            <span className="text-[9px] text-slate-400 font-bold mr-0.5">下班:</span>
                            <span className="text-sm font-black leading-none text-slate-600">
                              {nextArrival.remainingMinutes}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                            <span className="text-[8px] text-blue-600 font-bold ml-0.5">⏱️</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold block text-center">{arrival.remark || '暫無'}</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold italic block text-center">暫無</span>
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
            const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter(a => a.route === route) || [] : [];
            const arrival = routeArrivals[0] || null;
            const nextArrival = routeArrivals[1] || null;
            const styles = getPinnedStyles(arrival?.remainingMinutes ?? null);
            const isThisRouteActive = activeTimerRoute === route;
            const hasValidArrival = arrival?.remainingMinutes !== null && arrival?.remainingMinutes !== undefined;

            const firstIsUncatchable = hasValidArrival && (arrival?.remainingMinutes ?? 0) <= leadMinutes;
            const catchableNext = routeArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes);

            return (
              <div 
                key={route} 
                onClick={() => {
                  if (hasValidArrival) {
                    handleTriggerRouteTimer(route, null);
                  }
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border shadow-sm transition-all select-none ${
                  isThisRouteActive 
                    ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400 shadow-md' 
                    : hasValidArrival
                    ? 'bg-slate-50 hover:bg-blue-50/70 hover:border-blue-400 hover:shadow cursor-pointer active:scale-95'
                    : 'bg-slate-50'
                } ${styles.border}`}
                title={
                  hasValidArrival
                    ? firstIsUncatchable && catchableNext
                      ? `首班車（${arrival?.remainingMinutes}分）少於提前提醒時間趕不上，點擊自動為下班車（${catchableNext.remainingMinutes}分）倒數`
                      : `點擊為【${route}】到站時間（${arrival?.remainingMinutes}分）開始出門倒數`
                    : route
                }
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-blue-700">{route}</span>
                  {isThisRouteActive && (
                    <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs animate-pulse">
                      <Clock className="w-2.5 h-2.5" /> 倒數中
                    </span>
                  )}
                </div>
                <div>
                  {pinnedLoading && (!stop || !arrivals[`${stop.id}-${stop.route}`]) ? (
                    <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
                  ) : arrival ? (
                    arrival.remainingMinutes !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black ${styles.text}`}>
                            {arrival.remainingMinutes}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                        </div>
                        {!isThisRouteActive && (
                          firstIsUncatchable && catchableNext ? (
                            <span className="text-[10px] bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 transition-all border border-amber-300">
                              ⏱️ 下班{catchableNext.remainingMinutes}分
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 transition-all">
                              ⏱️ 計時
                            </span>
                          )
                        )}
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  const renderHomeSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div 
        onClick={() => {
          const next = !isHomeOpen;
          setIsHomeOpen(next);
          if (next) {
            setIsPinnedOpen(false);
            setIsKowloonOpen(false);
            setIsShenzhenOpen(false);
            setIsHuanggangOpen(false);
          } else {
            setIsPinnedOpen(true);
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
          const next = !isKowloonOpen;
          setIsKowloonOpen(next);
          if (next) {
            setIsPinnedOpen(false);
            setIsHomeOpen(false);
            setIsShenzhenOpen(false);
            setIsHuanggangOpen(false);
          } else {
            setIsPinnedOpen(true);
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
            <div className="p-4 space-y-4">
              {/* Departure Timer Widget for 出九龍 */}
              <DepartureTimer
                title="出九龍出門提醒計時器"
                targetDestination="出九龍"
                earliestRoute={earliestKowloonArrival?.route ?? null}
                earliestMinutes={earliestKowloonArrival?.minutes ?? null}
                earliestIsNextBus={earliestKowloonArrival?.isNextBus}
                availableRoutes={allKowloonRouteArrivals}
                selectedRouteTrigger={kowloonTimerTrigger}
                onActiveRouteChange={setActiveKowloonTimerRoute}
                leadMinutes={kowloonLeadMinutes}
                onLeadMinutesChange={setKowloonLeadMinutes}
                leadMinutesOptions={[6, 7, 8]}
                recommendedLeadMinutes={7}
                storageKey="bus_reminder_lead_minutes_kowloon"
                onRefresh={refreshAll}
                isRefreshing={loading}
                lastUpdated={lastUpdated}
              />

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold border-l-4 border-teal-600 pl-2 text-slate-700">
                  香港黃金海岸 (Gold Coast)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {kowloonStops.map((stop) => {
                    const stopArrivals = arrivals[`${stop.id}-${stop.route}`] || [];
                    const arrival = stopArrivals[0] || null;
                    const nextArrival = stopArrivals[1] || null;
                    const styles = getKowloonStyles(arrival?.remainingMinutes ?? null);
                    const isThisRouteActive = activeKowloonTimerRoute === stop.route;
                    const hasValidArrival = arrival?.remainingMinutes !== null && arrival?.remainingMinutes !== undefined;

                    const firstIsUncatchable = hasValidArrival && (arrival?.remainingMinutes ?? 0) <= kowloonLeadMinutes;
                    const catchableNext = stopArrivals.find(a => a.remainingMinutes !== null && a.remainingMinutes > kowloonLeadMinutes);

                    // Friendly destination hint
                    let destHint = '';
                    if (stop.route === '61M') destHint = '荔景(北)';
                    else if (stop.route === '52X') destHint = '旺角(柏景灣)';
                    else if (stop.route === '140M') destHint = '青衣站';
                    else if (stop.route === '952') destHint = '銅鑼灣(摩頓台)';

                    return (
                      <div 
                        key={`${stop.id}-${stop.route}`} 
                        onClick={() => {
                          if (hasValidArrival) {
                            handleTriggerKowloonRouteTimer(stop.route, null);
                          }
                        }}
                        className={`flex flex-col items-center p-3 rounded-xl border shadow-sm transition-all select-none ${
                          isThisRouteActive 
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400 shadow-md' 
                            : hasValidArrival
                            ? 'bg-slate-50 hover:bg-teal-50/70 hover:border-teal-400 hover:shadow cursor-pointer active:scale-95'
                            : 'bg-slate-50'
                        } ${styles.border}`}
                        title={
                          hasValidArrival
                            ? firstIsUncatchable && catchableNext
                              ? `首班車（${arrival?.remainingMinutes}分）少於提前提醒時間趕不上，點擊自動為下班車（${catchableNext.remainingMinutes}分）倒數`
                              : `點擊為【${stop.route}】到站時間（${arrival?.remainingMinutes}分）開始出門倒數`
                            : stop.route
                        }
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-base font-black text-teal-800 leading-tight">{stop.route}</span>
                          {isThisRouteActive && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                        {destHint && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-full text-center">
                            往 {destHint}
                          </span>
                        )}

                        <div className="mt-1 w-full">
                          {loading && stopArrivals.length === 0 ? (
                            <div className="w-8 h-4 bg-slate-200 animate-pulse rounded mx-auto" />
                          ) : arrival ? (
                            arrival.remainingMinutes !== null ? (
                              <div className="flex flex-col items-center w-full">
                                <div className="flex items-baseline gap-0.5">
                                  <span className={`text-lg font-black leading-none ${styles.text}`}>
                                    {arrival.remainingMinutes}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                </div>

                                {/* Interactive Countdown Indicator / Button */}
                                <div className="mt-1">
                                  {isThisRouteActive ? (
                                    <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs animate-pulse">
                                      <Clock className="w-2.5 h-2.5" /> 倒數中
                                    </span>
                                  ) : firstIsUncatchable && catchableNext ? (
                                    <span className="text-[9px] bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer border border-amber-300">
                                      ⏱️ 下班{catchableNext.remainingMinutes}分
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-teal-100 hover:bg-teal-600 text-teal-800 hover:text-white font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer">
                                      ⏱️ 計時
                                    </span>
                                  )}
                                </div>

                                {/* Next Arrival (Clickable for 2nd bus timer) */}
                                {nextArrival && nextArrival.remainingMinutes !== null && (
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerKowloonRouteTimer(stop.route, nextArrival.remainingMinutes);
                                    }}
                                    className="flex items-baseline justify-center gap-0.5 border-t border-slate-200/90 w-full pt-1 mt-1 hover:bg-teal-100/70 rounded transition-all cursor-pointer"
                                    title={`點擊為下班【${stop.route}】（${nextArrival.remainingMinutes}分）計時`}
                                  >
                                    <span className="text-[9px] text-slate-400 font-bold mr-0.5">下班:</span>
                                    <span className="text-sm font-black leading-none text-slate-600">
                                      {nextArrival.remainingMinutes}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">分</span>
                                    <span className="text-[8px] text-teal-600 font-bold ml-0.5">⏱️</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold block text-center">{arrival.remark || '暫無'}</span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold italic block text-center">暫無</span>
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
          const next = !isShenzhenOpen;
          setIsShenzhenOpen(next);
          if (next) {
            setIsPinnedOpen(false);
            setIsHomeOpen(false);
            setIsKowloonOpen(false);
            setIsHuanggangOpen(false);
          } else {
            setIsPinnedOpen(true);
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

  const renderHuanggangSection = () => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div 
        onClick={() => {
          const next = !isHuanggangOpen;
          setIsHuanggangOpen(next);
          if (next) {
            setIsPinnedOpen(false);
            setIsHomeOpen(false);
            setIsKowloonOpen(false);
            setIsShenzhenOpen(false);
          } else {
            setIsPinnedOpen(true);
          }
        }}
        className="w-full p-4 border-b border-slate-100 bg-amber-600 text-white flex items-center justify-between hover:bg-amber-700 transition-colors cursor-pointer"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          皇崗口岸
        </h2>
        <div className="flex items-center gap-3">
          {isHuanggangOpen && <RefreshControl />}
          {isHuanggangOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isHuanggangOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {/* 1. 去口岸開車時間 (往皇崗口岸) - 放在口岸開出時間組合的上方作識別 */}
              <div className="space-y-2 bg-amber-50/60 p-2.5 sm:p-3 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    <h3 className="text-sm font-bold border-l-4 border-amber-600 pl-2 text-slate-800">
                      去口岸開車時間 (往皇崗口岸)
                    </h3>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100/90 px-2 py-0.5 rounded">
                    屯門各站開出
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {huanggangToStops.map((stop) => {
                    const stopArrivals = arrivals[`${stop.id}-${stop.route}`] || [];
                    const displayArrivals = stopArrivals.slice(0, 2);
                    const firstArrival = displayArrivals[0];
                    const styles = getKowloonStyles(firstArrival?.remainingMinutes ?? null);

                    const typeBadge = stop.operator === 'GMB' ? '小巴' : '巴士';
                    const routeLabel = stop.route;

                    let stationTitle = '';
                    let stationDetail = '';
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

                    return (
                      <div key={`${stop.id}-${stop.route}`} className={`bg-white border rounded-xl p-2 sm:p-2.5 flex flex-col items-center shadow-sm transition-all ${styles.border}`}>
                        <div className="flex flex-col items-center mb-1.5 w-full text-center">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded leading-tight">
                              {typeBadge}
                            </span>
                            <span className="text-base sm:text-lg font-black text-blue-700 leading-tight tracking-tight">
                              {routeLabel}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight mt-0.5 line-clamp-1" title={stop.stopSeqDesc || stop.name}>
                            {stationTitle}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate max-w-full">
                            {stationDetail}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-700 mt-0.5">
                            往 皇崗口岸
                          </span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 w-full mt-auto">
                          {loading && stopArrivals.length === 0 ? (
                            <div className="w-12 h-6 bg-slate-200 animate-pulse rounded" />
                          ) : displayArrivals.length > 0 ? (
                            displayArrivals.map((arrival, idx) => (
                              <div key={idx} className={`flex items-baseline gap-1 ${idx === 0 ? '' : 'opacity-60 border-t border-slate-100 w-full justify-center pt-1 mt-1'}`}>
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

              {/* 2. 口岸開出時間 (往屯門) */}
              <div className="space-y-2 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h3 className="text-sm font-bold border-l-4 border-slate-500 pl-2 text-slate-800">
                      口岸開出時間 (往屯門)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/70 px-2 py-0.5 rounded">
                    皇崗口岸總站開出
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {huanggangFromStops.map((stop) => {
                    const stopArrivals = arrivals[`${stop.id}-${stop.route}`] || [];
                    const displayArrivals = stopArrivals.slice(0, 2);
                    const firstArrival = displayArrivals[0];
                    const styles = getKowloonStyles(firstArrival?.remainingMinutes ?? null);

                    const typeBadge = stop.operator === 'GMB' ? '小巴' : '巴士';
                    const routeLabel = stop.route;
                    const destLabel = stop.route === '44B1' ? '往 屯門碼頭' : stop.route === '44B' ? '往 屯門站' : '往 青山灣';

                    return (
                      <div key={`${stop.id}-${stop.route}`} className={`bg-white border rounded-xl p-2 sm:p-2.5 flex flex-col items-center shadow-sm transition-all ${styles.border}`}>
                        <div className="flex flex-col items-center mb-1.5 w-full text-center">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded leading-tight">
                              {typeBadge}
                            </span>
                            <span className="text-base sm:text-lg font-black text-blue-700 leading-tight tracking-tight">
                              {routeLabel}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 leading-tight mt-0.5 truncate max-w-full">
                            {destLabel}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">
                            皇崗口岸總站
                          </span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 w-full mt-auto">
                          {loading && stopArrivals.length === 0 ? (
                            <div className="w-12 h-6 bg-slate-200 animate-pulse rounded" />
                          ) : displayArrivals.length > 0 ? (
                            displayArrivals.map((arrival, idx) => (
                              <div key={idx} className={`flex items-baseline gap-1 ${idx === 0 ? '' : 'opacity-60 border-t border-slate-100 w-full justify-center pt-1 mt-1'}`}>
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

  // Determine display order based on which section is currently opened
  let sectionOrder: Array<'pinned' | 'home' | 'kowloon' | 'shenzhen' | 'huanggang'> = [
    'pinned',
    'home',
    'kowloon',
    'shenzhen',
    'huanggang',
  ];

  if (isHuanggangOpen) {
    sectionOrder = ['huanggang', 'pinned', 'shenzhen', 'kowloon', 'home'];
  } else if (isShenzhenOpen) {
    sectionOrder = ['shenzhen', 'pinned', 'huanggang', 'kowloon', 'home'];
  } else if (isKowloonOpen) {
    sectionOrder = ['kowloon', 'pinned', 'shenzhen', 'huanggang', 'home'];
  } else if (isHomeOpen) {
    sectionOrder = ['home', 'pinned', 'kowloon', 'shenzhen', 'huanggang'];
  }

  const renderSectionById = (id: 'pinned' | 'home' | 'kowloon' | 'shenzhen' | 'huanggang') => {
    switch (id) {
      case 'pinned':
        return renderPinnedSection();
      case 'home':
        return renderHomeSection();
      case 'kowloon':
        return renderKowloonSection();
      case 'shenzhen':
        return renderShenzhenSection();
      case 'huanggang':
        return renderHuanggangSection();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
        {locationError && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700">
            <MapPin className="w-5 h-5" />
            <p className="text-sm">{locationError}</p>
          </div>
        )}

        {/* Dynamic section display order: Opened section data is displayed first */}
        {sectionOrder.map((id) => (
          <div key={id}>{renderSectionById(id)}</div>
        ))}

      </div>
    </div>
  );
}
