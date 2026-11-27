/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, MapPin, X } from 'lucide-react';
import { STOPS } from './config/stops';
import { useBusETA } from './hooks/useBusETA';
import { useGeolocation } from './hooks/useGeolocation';
import { RouteTimerTrigger, SectionCategory } from './types';
import { PinnedSection } from './components/sections/PinnedSection';
import { HomeSection } from './components/sections/HomeSection';
import { KowloonSection } from './components/sections/KowloonSection';
import { ShenzhenSection } from './components/sections/ShenzhenSection';
import { HuanggangSection } from './components/sections/HuanggangSection';

const PINNED_STOPS = STOPS.filter((s) => s.category === 'pinned');
const HOME_STOPS = STOPS.filter((s) => s.category === 'home');
const KOWLOON_STOPS = STOPS.filter((s) => s.category === 'kowloon');
const SHENZHEN_STOPS = STOPS.filter((s) => s.category === 'shenzhen');
const HUANGGANG_TO_STOPS = STOPS.filter((s) => s.category === 'huanggang' && s.subCategory === 'to_port');
const HUANGGANG_FROM_STOPS = STOPS.filter((s) => s.category === 'huanggang' && s.subCategory === 'from_port');

export default function App() {
  const [isPinnedOpen, setIsPinnedOpen] = useState<boolean>(true);
  const [isHomeOpen, setIsHomeOpen] = useState<boolean>(false);
  const [isKowloonOpen, setIsKowloonOpen] = useState<boolean>(false);
  const [isShenzhenOpen, setIsShenzhenOpen] = useState<boolean>(false);
  const [isHuanggangOpen, setIsHuanggangOpen] = useState<boolean>(false);

  const [timerTrigger, setTimerTrigger] = useState<RouteTimerTrigger | null>(null);
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
    } catch {
      // ignore
    }
    return 9;
  });

  const [kowloonTimerTrigger, setKowloonTimerTrigger] = useState<RouteTimerTrigger | null>(null);
  const [activeKowloonTimerRoute, setActiveKowloonTimerRoute] = useState<string | null>(null);
  const [kowloonLeadMinutes, setKowloonLeadMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bus_reminder_lead_minutes_kowloon');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([6, 7, 8].includes(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return 7;
  });

  const activeCategory: SectionCategory = useMemo(() => {
    if (isHuanggangOpen) return 'huanggang';
    if (isShenzhenOpen) return 'shenzhen';
    if (isKowloonOpen) return 'kowloon';
    if (isHomeOpen) return 'home';
    return 'pinned';
  }, [isHuanggangOpen, isShenzhenOpen, isKowloonOpen, isHomeOpen]);

  const {
    arrivals,
    loading,
    pinnedLoading,
    lastUpdated,
    error,
    refreshAll,
    getKeyStatus,
  } = useBusETA({
    activeCategory,
    activeTimerRoute,
    activeKowloonTimerRoute,
  });

  const {
    userLocation,
    locationError,
    nearestArea,
    nearbyHomeSuggestion,
    homeSuggestionDismissed,
    dismissHomeSuggestion,
    getWalkingMinutes,
    huanggangActiveDirection,
    manualHuanggangDirection,
    setManualHuanggangDirection,
    huanggangLocationHint,
  } = useGeolocation();

  const openOnlySection = useCallback((section: SectionCategory) => {
    setIsPinnedOpen(section === 'pinned');
    setIsHomeOpen(section === 'home');
    setIsKowloonOpen(section === 'kowloon');
    setIsShenzhenOpen(section === 'shenzhen');
    setIsHuanggangOpen(section === 'huanggang');
  }, []);

  const handleTogglePinned = useCallback(() => {
    setIsPinnedOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsHomeOpen(false);
        setIsKowloonOpen(false);
        setIsShenzhenOpen(false);
        setIsHuanggangOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleHome = useCallback(() => {
    setIsHomeOpen((prev) => {
      const next = !prev;
      if (next) {
        openOnlySection('home');
      } else {
        setIsPinnedOpen(true);
      }
      return next;
    });
  }, [openOnlySection]);

  const handleToggleKowloon = useCallback(() => {
    setIsKowloonOpen((prev) => {
      const next = !prev;
      if (next) {
        openOnlySection('kowloon');
      } else {
        setIsPinnedOpen(true);
      }
      return next;
    });
  }, [openOnlySection]);

  const handleToggleShenzhen = useCallback(() => {
    setIsShenzhenOpen((prev) => {
      const next = !prev;
      if (next) {
        openOnlySection('shenzhen');
      } else {
        setIsPinnedOpen(true);
      }
      return next;
    });
  }, [openOnlySection]);

  const handleToggleHuanggang = useCallback(() => {
    setIsHuanggangOpen((prev) => {
      const next = !prev;
      if (next) {
        openOnlySection('huanggang');
      } else {
        setIsPinnedOpen(true);
      }
      return next;
    });
  }, [openOnlySection]);

  const handleTriggerRouteTimer = useCallback(
    (route: string, clickedArrivalMinutes?: number | null, clickedEtaTimestampMs?: number) => {
      const stop = PINNED_STOPS.find((s) => s.route === route);
      const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter((a) => a.route === route) || [] : [];
      const first = routeArrivals[0];

      openOnlySection('pinned');

      if (clickedArrivalMinutes !== undefined && clickedArrivalMinutes !== null && clickedArrivalMinutes > leadMinutes) {
        const isNextBus = first && clickedArrivalMinutes !== first.remainingMinutes;
        const matched = routeArrivals.find((a) => a.remainingMinutes === clickedArrivalMinutes);
        setTimerTrigger({
          route,
          minutes: clickedArrivalMinutes,
          etaTimestampMs: clickedEtaTimestampMs ?? matched?.etaTimestampMs,
          isNextBus,
          originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
          timestamp: Date.now(),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const catchable = routeArrivals.find(
        (a) => a.remainingMinutes !== null && a.remainingMinutes > leadMinutes
      );

      if (catchable && catchable.remainingMinutes !== null) {
        const isNextBus = catchable !== first;
        setTimerTrigger({
          route,
          minutes: catchable.remainingMinutes,
          etaTimestampMs: catchable.etaTimestampMs,
          isNextBus,
          originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
          timestamp: Date.now(),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (first && first.remainingMinutes !== null) {
        setTimerTrigger({
          route,
          minutes: first.remainingMinutes,
          etaTimestampMs: first.etaTimestampMs,
          isNextBus: false,
          timestamp: Date.now(),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [arrivals, leadMinutes, openOnlySection]
  );

  const handleTriggerKowloonRouteTimer = useCallback(
    (route: string, clickedArrivalMinutes?: number | null, clickedEtaTimestampMs?: number) => {
      const stop = KOWLOON_STOPS.find((s) => s.route === route);
      const routeArrivals = stop ? arrivals[`${stop.id}-${stop.route}`]?.filter((a) => a.route === route) || [] : [];
      const first = routeArrivals[0];

      openOnlySection('kowloon');

      if (
        clickedArrivalMinutes !== undefined &&
        clickedArrivalMinutes !== null &&
        clickedArrivalMinutes > kowloonLeadMinutes
      ) {
        const isNextBus = first && clickedArrivalMinutes !== first.remainingMinutes;
        const matched = routeArrivals.find((a) => a.remainingMinutes === clickedArrivalMinutes);
        setKowloonTimerTrigger({
          route,
          minutes: clickedArrivalMinutes,
          etaTimestampMs: clickedEtaTimestampMs ?? matched?.etaTimestampMs,
          isNextBus,
          originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
          timestamp: Date.now(),
        });
        return;
      }

      const catchable = routeArrivals.find(
        (a) => a.remainingMinutes !== null && a.remainingMinutes > kowloonLeadMinutes
      );

      if (catchable && catchable.remainingMinutes !== null) {
        const isNextBus = catchable !== first;
        setKowloonTimerTrigger({
          route,
          minutes: catchable.remainingMinutes,
          etaTimestampMs: catchable.etaTimestampMs,
          isNextBus,
          originalMinutes: isNextBus ? (first?.remainingMinutes ?? undefined) : undefined,
          timestamp: Date.now(),
        });
      } else if (first && first.remainingMinutes !== null) {
        setKowloonTimerTrigger({
          route,
          minutes: first.remainingMinutes,
          etaTimestampMs: first.etaTimestampMs,
          isNextBus: false,
          timestamp: Date.now(),
        });
      }
    },
    [arrivals, kowloonLeadMinutes, openOnlySection]
  );

  let sectionOrder: SectionCategory[] = ['pinned', 'home', 'kowloon', 'shenzhen', 'huanggang'];
  if (isHuanggangOpen) {
    sectionOrder = ['huanggang', 'pinned', 'shenzhen', 'kowloon', 'home'];
  } else if (isShenzhenOpen) {
    sectionOrder = ['shenzhen', 'pinned', 'huanggang', 'kowloon', 'home'];
  } else if (isKowloonOpen) {
    sectionOrder = ['kowloon', 'pinned', 'shenzhen', 'huanggang', 'home'];
  } else if (isHomeOpen) {
    sectionOrder = ['home', 'pinned', 'kowloon', 'shenzhen', 'huanggang'];
  }

  const renderSectionById = (id: SectionCategory) => {
    switch (id) {
      case 'pinned':
        return (
          <PinnedSection
            isOpen={isPinnedOpen}
            onToggle={handleTogglePinned}
            stops={PINNED_STOPS}
            arrivals={arrivals}
            loading={loading}
            pinnedLoading={pinnedLoading}
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            getKeyStatus={getKeyStatus}
            activeTimerRoute={activeTimerRoute}
            onActiveTimerRouteChange={setActiveTimerRoute}
            leadMinutes={leadMinutes}
            onLeadMinutesChange={setLeadMinutes}
            timerTrigger={timerTrigger}
            onTriggerRouteTimer={handleTriggerRouteTimer}
          />
        );
      case 'home':
        return (
          <HomeSection
            isOpen={isHomeOpen}
            onToggle={handleToggleHome}
            stops={HOME_STOPS}
            arrivals={arrivals}
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            getKeyStatus={getKeyStatus}
            nearestArea={nearestArea}
            hasLocation={Boolean(userLocation)}
            getWalkingMinutes={getWalkingMinutes}
          />
        );
      case 'kowloon':
        return (
          <KowloonSection
            isOpen={isKowloonOpen}
            onToggle={handleToggleKowloon}
            stops={KOWLOON_STOPS}
            arrivals={arrivals}
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            getKeyStatus={getKeyStatus}
            activeKowloonTimerRoute={activeKowloonTimerRoute}
            onActiveKowloonTimerRouteChange={setActiveKowloonTimerRoute}
            kowloonLeadMinutes={kowloonLeadMinutes}
            onKowloonLeadMinutesChange={setKowloonLeadMinutes}
            kowloonTimerTrigger={kowloonTimerTrigger}
            onTriggerKowloonRouteTimer={handleTriggerKowloonRouteTimer}
          />
        );
      case 'shenzhen':
        return (
          <ShenzhenSection
            isOpen={isShenzhenOpen}
            onToggle={handleToggleShenzhen}
            stops={SHENZHEN_STOPS}
            arrivals={arrivals}
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            getKeyStatus={getKeyStatus}
          />
        );
      case 'huanggang':
        return (
          <HuanggangSection
            isOpen={isHuanggangOpen}
            onToggle={handleToggleHuanggang}
            toStops={HUANGGANG_TO_STOPS}
            fromStops={HUANGGANG_FROM_STOPS}
            arrivals={arrivals}
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            getKeyStatus={getKeyStatus}
            activeDirection={huanggangActiveDirection}
            manualDirection={manualHuanggangDirection}
            onSetManualDirection={setManualHuanggangDirection}
            locationHint={huanggangLocationHint}
          />
        );
    }
  };

  return (
    <div translate="no" className="notranslate min-h-screen bg-[#15181d] text-[#eef2f6] font-sans p-3 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-3.5 sm:space-y-5">
        {error && (
          <div className="bg-rose-500/12 border border-rose-400/30 p-3.5 rounded-xl flex items-center gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {locationError && (
          <div className="bg-amber-500/12 border border-amber-400/25 p-3.5 rounded-xl flex items-center gap-3 text-amber-200">
            <MapPin className="w-5 h-5 text-amber-300 shrink-0" />
            <p className="text-sm">{locationError}</p>
          </div>
        )}

        {/* Smart GPS Suggestion Pill (does not steal focus) */}
        {nearbyHomeSuggestion && !homeSuggestionDismissed && !isHomeOpen && (
          <div className="surface-raised border border-[#e27d48]/40 text-[#eef2f6] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => openOnlySection('home')}
              className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-left flex-1 cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-[#e27d48]/15 border border-[#e27d48]/30 text-[#ef996b] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <span>
                位於<strong className="text-white mx-0.5">{nearbyHomeSuggestion.areaName}</strong>附近
                {nearbyHomeSuggestion.walkingMins === 0
                  ? '（已到站旁）'
                  : `（步程約 ${nearbyHomeSuggestion.walkingMins} 分）`}
                {' · '}
                <span className="text-[#ef996b] underline decoration-[#e27d48]/60 underline-offset-2 font-bold">
                  點擊查看【回家】
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissHomeSuggestion();
              }}
              className="btn-tactile-secondary p-1.5 rounded-lg cursor-pointer shrink-0"
              aria-label="關閉位置建議"
              title="關閉提示"
            >
              <X className="w-4 h-4" />
            </button>
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
