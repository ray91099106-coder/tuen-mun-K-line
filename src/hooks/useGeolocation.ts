/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HOME_STOP_AREAS,
  HOME_SUGGESTION_RADIUS_METERS,
  HUANGGANG_REFERENCE_COORDS,
} from '../config/stops';

export interface NearbyHomeSuggestion {
  areaName: string;
  walkingMins: number;
}

export interface HuanggangLocationHint {
  near: 'to_port' | 'from_port';
  text: string;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export function useGeolocation() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearestArea, setNearestArea] = useState<string | null>(null);
  const [nearbyHomeSuggestion, setNearbyHomeSuggestion] = useState<NearbyHomeSuggestion | null>(null);
  const [homeSuggestionDismissed, setHomeSuggestionDismissed] = useState<boolean>(false);
  const [manualHuanggangDirection, setManualHuanggangDirection] = useState<'to_port' | 'from_port' | null>(null);

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
                  lng: position.coords.longitude,
                });
                setLocationError(null);
              }
            } catch {
              // Ignore
            }
          },
          (error) => {
            // Stop watching if position is unavailable to prevent continuous browser error events
            if (watchId !== null && (error?.code === 2 || error?.code === 1)) {
              try {
                navigator.geolocation.clearWatch(watchId);
              } catch {
                // Ignore
              }
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
      } catch {
        // Suppress
      }
    };

    const stopWatching = () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // Ignore
        }
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

    let minDistance = Infinity;
    let closest: string | null = null;
    let closestShortName: string | null = null;

    HOME_STOP_AREAS.forEach((area) => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, area.lat, area.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = area.name;
        closestShortName = area.shortName;
      }
    });

    setNearestArea(closest);

    // Within ~600m: update suggestion metadata (dismissed state persists across updates)
    if (closestShortName && minDistance <= HOME_SUGGESTION_RADIUS_METERS) {
      setNearbyHomeSuggestion({
        areaName: closestShortName,
        walkingMins: Math.round(minDistance / 60),
      });
    } else {
      setNearbyHomeSuggestion(null);
    }
  }, [userLocation]);

  const dismissHomeSuggestion = useCallback(() => {
    setHomeSuggestionDismissed(true);
  }, []);

  const getWalkingMinutes = useCallback(
    (lat?: number, lng?: number): number => {
      if (!userLocation || lat === undefined || lng === undefined) return 0;
      const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
      return Math.round(dist / 60);
    },
    [userLocation]
  );

  // Determine active direction in Huanggang Port block based on location (Tuen Mun vs Huanggang Port)
  const huanggangActiveDirection = useMemo<'to_port' | 'from_port'>(() => {
    if (manualHuanggangDirection) return manualHuanggangDirection;
    if (!userLocation) return 'to_port'; // Default: in Tuen Mun / heading to port

    const distToTuenMun = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      HUANGGANG_REFERENCE_COORDS.tuenMunCore.lat,
      HUANGGANG_REFERENCE_COORDS.tuenMunCore.lng
    );
    const distToHuanggang = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      HUANGGANG_REFERENCE_COORDS.huanggangPort.lat,
      HUANGGANG_REFERENCE_COORDS.huanggangPort.lng
    );

    return distToHuanggang < distToTuenMun ? 'from_port' : 'to_port';
  }, [userLocation, manualHuanggangDirection]);

  const huanggangLocationHint = useMemo<HuanggangLocationHint | null>(() => {
    if (!userLocation) return null;
    const distToTuenMun = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      HUANGGANG_REFERENCE_COORDS.tuenMunCore.lat,
      HUANGGANG_REFERENCE_COORDS.tuenMunCore.lng
    );
    const distToHuanggang = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      HUANGGANG_REFERENCE_COORDS.huanggangPort.lat,
      HUANGGANG_REFERENCE_COORDS.huanggangPort.lng
    );

    if (distToHuanggang < distToTuenMun) {
      const km = (distToHuanggang / 1000).toFixed(1);
      return {
        near: 'from_port',
        text: `📍 靠近口岸 (${km}km)`,
      };
    }
    const km = (distToTuenMun / 1000).toFixed(1);
    return {
      near: 'to_port',
      text: `📍 靠近屯門 (${km}km)`,
    };
  }, [userLocation]);

  return {
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
  };
}
