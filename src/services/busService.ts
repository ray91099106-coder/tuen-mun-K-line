/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusArrival, KMBETAResponse, MTRBETAResponse, StopInfo } from '../types';

export const STOPS: StopInfo[] = [
  // Pinned: Gold Coast Piazza (往屯門)
  {
    id: 'K51-D090',
    name: '香港黃金海岸 (Hong Kong Gold Coast)',
    route: 'K51',
    bound: 'D',
    operator: 'MTRB',
    category: 'pinned',
  },
  {
    id: 'K53-D050',
    name: '香港黃金海岸 (Hong Kong Gold Coast)',
    route: 'K53',
    bound: 'D',
    operator: 'MTRB',
    category: 'pinned',
  },
  {
    id: 'K51A-D070',
    name: '香港黃金海岸 (Hong Kong Gold Coast)',
    route: 'K51A',
    bound: 'D',
    operator: 'MTRB',
    category: 'pinned',
  },
  {
    id: 'F626C47C1F73E1AE',
    name: '香港黃金海岸 (Gold Coast)',
    route: '61M',
    bound: 'I',
    operator: 'KMB',
    category: 'pinned',
  },
  {
    id: 'F626C47C1F73E1AE',
    name: '香港黃金海岸 (Gold Coast)',
    route: '52X',
    bound: 'I',
    operator: 'KMB',
    category: 'pinned',
  },

  // 回家 (Home) - 站點 1：新墟
  {
    id: 'K51-U070,6',
    name: '新墟(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K51A-U070,6',
    name: '新墟(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },

  // 回家 (Home) - 站點 2：屯門站
  {
    id: 'K51-U080,7',
    name: '屯門站(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K51A-U080,7',
    name: '屯門站(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K53-U010,1',
    name: '屯門站(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },

  // 回家 (Home) - 站點 3：市中心
  {
    id: 'K51-U090,8',
    name: '市中心(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K51A-U090,8',
    name: '市中心(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K53-U020,1',
    name: '市中心(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: '10DABE0380229B4D',
    name: '市中心(往置樂方向)',
    route: '52X',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
  },

  // 回家 (Home) - 站點 4：華都
  {
    id: 'K51-U100,9',
    name: '華都(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K51A-U100,9',
    name: '華都(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: 'K53-U030,2',
    name: '華都(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
  },
  {
    id: '1E15CFA82F408124',
    name: '華都(往置樂方向)',
    route: '52X',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
  },
  {
    id: '1E15CFA82F408124',
    name: '華都(往置樂方向)',
    route: '61M',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
  },
  // 出九龍 (To Kowloon)
  {
    id: '7FB2AE7FA13EDB0F',
    name: '香港黃金海岸 (Gold Coast)',
    route: '61M',
    bound: 'O',
    operator: 'KMB',
    category: 'kowloon',
  },
  {
    id: '7FB2AE7FA13EDB0F',
    name: '香港黃金海岸 (Gold Coast)',
    route: '52X',
    bound: 'O',
    operator: 'KMB',
    category: 'kowloon',
  },
  {
    id: '20006914', // Golden Coast stop ID for 140M
    name: '香港黃金海岸 (Gold Coast)',
    route: '140M',
    bound: '1',
    operator: 'GMB',
    category: 'kowloon',
  },
  {
    id: '001890', // Golden Coast stop ID for 952
    name: '香港黃金海岸 (Gold Coast)',
    route: '952',
    bound: 'O',
    operator: 'CTB',
    category: 'kowloon',
  },
];

export async function fetchAllETA(stops: StopInfo[]): Promise<Record<string, BusArrival[]>> {
  const now = new Date();
  const results: Record<string, BusArrival[]> = {};

  // Group stops by operator
  const kmbStopIds = Array.from(new Set(stops.filter(s => s.operator === 'KMB').map(s => s.id)));
  const mtrbRoutes = Array.from(new Set(stops.filter(s => s.operator === 'MTRB').map(s => s.route)));
  const ctbStops = stops.filter(s => s.operator === 'CTB');
  const gmbStops = stops.filter(s => s.operator === 'GMB');

  // Fetch KMB data
  const kmbPromises = kmbStopIds.map(async (stopId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`/api/bus/kmb/${stopId}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data: KMBETAResponse = await response.json();
      return { stopId, data: data.data || [] };
    } catch (error) {
      console.error(`KMB API Error for stop ${stopId}:`, error);
      return { stopId, data: [] };
    }
  });

  // Fetch MTRB data
  const mtrbPromises = mtrbRoutes.map(async (route) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/bus/mtrb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeName: route, language: 'zh' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data: MTRBETAResponse = await response.json();
      return { route, data: data.busStop || [] };
    } catch (error) {
      console.error(`MTRB API Error for route ${route}:`, error);
      return { route, data: [] };
    }
  });

  // Fetch CTB data
  const ctbPromises = ctbStops.map(async (stop) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`/api/bus/ctb/${stop.id}/${stop.route}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      return { key: `${stop.id}-${stop.route}`, data: data.data || [] };
    } catch (error) {
      console.error(`CTB API Error for ${stop.route}:`, error);
      return { key: `${stop.id}-${stop.route}`, data: [] };
    }
  });

  // Fetch GMB data
  const gmbPromises = gmbStops.map(async (stop) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      // Map route names to GMB route IDs
      const routeIdMap: Record<string, string> = {
        '140M': '2004598'
      };
      const routeId = routeIdMap[stop.route] || stop.route;
      const response = await fetch(`/api/bus/gmb/eta/${routeId}/${stop.id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      return { key: `${stop.id}-${stop.route}`, data: data.data || [] };
    } catch (error) {
      console.error(`GMB API Error for ${stop.route}:`, error);
      return { key: `${stop.id}-${stop.route}`, data: [] };
    }
  });

  const [kmbResults, mtrbResults, ctbResults, gmbResults] = await Promise.all([
    Promise.all(kmbPromises),
    Promise.all(mtrbPromises),
    Promise.all(ctbPromises),
    Promise.all(gmbPromises)
  ]);

  // Map results back to individual stops
  stops.forEach(stop => {
    const key = `${stop.id}-${stop.route}`;
    
    if (stop.operator === 'KMB') {
      const stopData = kmbResults.find(r => r.stopId === stop.id)?.data || [];
      const filtered = stopData
        .filter((item) => item.route === stop.route && (item.dir === stop.bound || !stop.bound))
        .sort((a, b) => {
          if (!a.eta) return 1;
          if (!b.eta) return -1;
          return new Date(a.eta).getTime() - new Date(b.eta).getTime();
        })
        .slice(0, 3);

      results[key] = filtered.map((item) => {
        const etaDate = item.eta ? new Date(item.eta) : null;
        const diff = etaDate ? Math.floor((etaDate.getTime() - now.getTime()) / 60000) : null;
        return {
          route: item.route,
          destination: item.dest_tc,
          eta: item.eta,
          remainingMinutes: diff !== null && diff >= 0 ? diff : 0,
          remark: item.rmk_tc || '',
        };
      });
    } else if (stop.operator === 'MTRB') {
      const routeData = mtrbResults.find(r => r.route === stop.route)?.data || [];
      const stopIdToMatch = stop.id.split(',')[0];
      const stopData = routeData.find((s) => s.busStopId === stopIdToMatch);
      
      if (!stopData || !stopData.bus || !Array.isArray(stopData.bus)) {
        results[key] = [];
        return;
      }

      results[key] = stopData.bus.map((item) => {
        let remainingMinutes = item.departureTimeInSecond 
          ? Math.floor(parseInt(item.departureTimeInSecond) / 60) 
          : 0;
        
        if (stop.route === 'K51') {
          if (stop.id === 'K51-U070,6' || stop.id === 'K51-U080,7') {
            remainingMinutes = Math.max(0, remainingMinutes - 2);
          }
        }
        
        let destination = '未知目的地';
        if (stop.route === 'K51') destination = '富泰 (Fu Tai)';
        else if (stop.route === 'K53') destination = '屯門站 (Tuen Mun Station)';
        else if (stop.route === 'K51A') destination = '富泰 (Fu Tai)';

        return {
          route: stop.route,
          destination,
          eta: item.departureTimeText || '',
          remainingMinutes: remainingMinutes >= 0 ? remainingMinutes : 0,
          remark: item.busRemark || '',
        };
      });
    } else if (stop.operator === 'CTB') {
      const stopData = ctbResults.find(r => r.key === key)?.data || [];
      const filtered = stopData.filter((item: any) => item.dir === stop.bound || !stop.bound);
      results[key] = filtered.map((item: any) => {
        const etaDate = item.eta ? new Date(item.eta) : null;
        const diff = etaDate ? Math.floor((etaDate.getTime() - now.getTime()) / 60000) : null;
        return {
          route: item.route,
          destination: item.dest_tc,
          eta: item.eta,
          remainingMinutes: diff !== null && diff >= 0 ? diff : 0,
          remark: item.rmk_tc || '',
        };
      });
    } else if (stop.operator === 'GMB') {
      const stopData = gmbResults.find(r => r.key === key)?.data || [];
      // GMB API returns eta array inside data[0]
      const etas: { timestamp: string; remark: string }[] = [];
      
      const targetSeqData = stop.bound ? stopData.find((d: any) => d.route_seq === Number(stop.bound)) : stopData[0];
      
      if (targetSeqData && targetSeqData.eta) {
        targetSeqData.eta.forEach((item: any) => {
          if (item.timestamp) etas.push({ timestamp: item.timestamp, remark: item.remarks_tc || '' });
        });
      }
      
      results[key] = etas.map((etaObj) => {
        const etaDate = new Date(etaObj.timestamp);
        const diff = Math.floor((etaDate.getTime() - now.getTime()) / 60000);
        return {
          route: stop.route,
          destination: stop.route === '140M' ? '青衣站' : '未知',
          eta: etaObj.timestamp,
          remainingMinutes: diff >= 0 ? diff : 0,
          remark: etaObj.remark,
        };
      });
    }
  });

  return results;
}
