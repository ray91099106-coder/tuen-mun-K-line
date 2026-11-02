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
    lat: 22.3983,
    lng: 113.9753,
  },
  {
    id: 'K51A-U070,6',
    name: '新墟(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3983,
    lng: 113.9753,
  },

  // 回家 (Home) - 站點 2：屯門站
  {
    id: 'K51-U080,7',
    name: '屯門站(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3946,
    lng: 113.9731,
  },
  {
    id: 'K51A-U080,7',
    name: '屯門站(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3946,
    lng: 113.9731,
  },
  {
    id: 'K53-U010,1',
    name: '屯門站(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3946,
    lng: 113.9731,
  },

  // 回家 (Home) - 站點 3：市中心
  {
    id: 'K51-U090,8',
    name: '市中心(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3913,
    lng: 113.9755,
  },
  {
    id: 'K51A-U090,8',
    name: '市中心(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3913,
    lng: 113.9755,
  },
  {
    id: 'K53-U020,1',
    name: '市中心(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3913,
    lng: 113.9755,
  },
  {
    id: '10DABE0380229B4D',
    name: '市中心(往置樂方向)',
    route: '52X',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
    lat: 22.3913,
    lng: 113.9755,
  },

  // 回家 (Home) - 站點 4：華都
  {
    id: 'K51-U100,9',
    name: '華都(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3906,
    lng: 113.9789,
  },
  {
    id: 'K51A-U100,9',
    name: '華都(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3906,
    lng: 113.9789,
  },
  {
    id: 'K53-U030,2',
    name: '華都(往置樂方向)',
    route: 'K53',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    lat: 22.3906,
    lng: 113.9789,
  },
  {
    id: '1E15CFA82F408124',
    name: '華都(往置樂方向)',
    route: '52X',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
    lat: 22.3906,
    lng: 113.9789,
  },
  {
    id: '1E15CFA82F408124',
    name: '華都(往置樂方向)',
    route: '61M',
    bound: 'O',
    operator: 'KMB',
    category: 'home',
    lat: 22.3906,
    lng: 113.9789,
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
  // 深圳灣口岸 (Shenzhen Bay Port)
  {
    id: '003208',
    name: '深圳灣口岸 (Shenzhen Bay Port)',
    route: 'B3X',
    bound: '',
    operator: 'CTB',
    category: 'shenzhen',
  },
  {
    id: '003208',
    name: '深圳灣口岸 (Shenzhen Bay Port)',
    route: 'B3',
    bound: '',
    operator: 'CTB',
    category: 'shenzhen',
  },
  // 皇崗口岸 (Huanggang Port) - 去口岸開車時間 (往皇崗口岸)
  {
    id: '20001319',
    name: '屯門鄉事會路，市中心輕鐵站外',
    route: '44B1',
    bound: '2',
    operator: 'GMB',
    category: 'huanggang',
    subCategory: 'to_port',
    stopSeqDesc: '第11站 屯門鄉事會路，市中心輕鐵站外',
  },
  {
    id: '20001311',
    name: '屯門站公共運輸交匯處',
    route: '44B',
    bound: '2',
    operator: 'GMB',
    category: 'huanggang',
    subCategory: 'to_port',
    stopSeqDesc: '第一站 屯門站公共運輸交匯處',
  },
  {
    id: '003198',
    name: '屯門市中心，1屯門鄉事會路',
    route: 'B15',
    bound: 'I',
    operator: 'CTB',
    category: 'huanggang',
    subCategory: 'to_port',
    stopSeqDesc: '第9站 屯門市中心，1屯門鄉事會路',
  },

  // 皇崗口岸 (Huanggang Port) - 口岸開出時間 (往屯門)
  {
    id: '20023758',
    name: '皇崗口岸總站',
    route: '44B1',
    bound: '1',
    operator: 'GMB',
    category: 'huanggang',
    subCategory: 'from_port',
  },
  {
    id: '20023758',
    name: '皇崗口岸總站',
    route: '44B',
    bound: '1',
    operator: 'GMB',
    category: 'huanggang',
    subCategory: 'from_port',
  },
  {
    id: '003939',
    name: '皇崗口岸總站',
    route: 'B15',
    bound: 'O',
    operator: 'CTB',
    category: 'huanggang',
    subCategory: 'from_port',
  },
];

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchETAForStops(stops: StopInfo[]): Promise<Record<string, BusArrival[]>> {
  if (stops.length === 0) return {};
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
      const response = await fetchWithTimeout(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`);
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
      const response = await fetchWithTimeout('https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeName: route, language: 'zh' }),
      });
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
      const response = await fetchWithTimeout(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stop.id}/${stop.route}`);
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
      // Map route names to GMB route IDs
      const routeIdMap: Record<string, string> = {
        '140M': '2004598',
        '44B1': '2004197',
        '44B': '2004164',
      };
      const routeId = routeIdMap[stop.route] || stop.route;
      const response = await fetchWithTimeout(`https://data.etagmb.gov.hk/eta/route-stop/${routeId}/${stop.id}`);
      const data = await response.json();
      let stopData = data.data || [];

      // If 44B daytime has no active ETAs (e.g. night hours 23:00-06:30), check overnight N44B (routeId 2004165)
      if (stop.route === '44B') {
        const targetSeq = stop.bound ? stopData.find((d: any) => d.route_seq === Number(stop.bound)) : stopData[0];
        if (!targetSeq || !targetSeq.eta || targetSeq.eta.length === 0) {
          try {
            const n44bRes = await fetchWithTimeout(`https://data.etagmb.gov.hk/eta/route-stop/2004165/${stop.id}`, {}, 3000);
            const n44bData = await n44bRes.json();
            if (n44bData.data && n44bData.data.length > 0) {
              stopData = n44bData.data;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      return { key: `${stop.id}-${stop.route}`, data: stopData };
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
          remainingMinutes: diff !== null ? Math.max(0, diff) : null,
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
          : null;
        
        if (remainingMinutes !== null && stop.route === 'K51') {
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
          remainingMinutes: remainingMinutes !== null ? Math.max(0, remainingMinutes) : null,
          remark: item.busRemark || '',
        };
      });
    } else if (stop.operator === 'CTB') {
      const stopData = ctbResults.find(r => r.key === key)?.data || [];
      const filtered = stopData.filter((item: any) => item.dir === stop.bound || !stop.bound);
      results[key] = filtered.map((item: any) => {
        const etaDate = item.eta ? new Date(item.eta) : null;
        const diff = etaDate ? Math.floor((etaDate.getTime() - now.getTime()) / 60000) : null;
        let dest = item.dest_tc;
        if (!dest && stop.route === 'B15') {
          dest = stop.bound === 'I' ? '皇崗口岸' : '青山灣';
        }
        return {
          route: item.route,
          destination: dest || '',
          eta: item.eta,
          remainingMinutes: diff !== null ? Math.max(0, diff) : null,
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
        let destination = '未知';
        if (stop.route === '140M') destination = '青衣站';
        else if (stop.route === '44B1') destination = stop.bound === '2' ? '皇崗口岸' : '屯門碼頭';
        else if (stop.route === '44B') destination = stop.bound === '2' ? '皇崗口岸' : '屯門站';
        return {
          route: stop.route,
          destination,
          eta: etaObj.timestamp,
          remainingMinutes: Math.max(0, diff),
          remark: etaObj.remark,
        };
      });
    }
  });

  return results;
}

export async function fetchAllETA(
  stops: StopInfo[],
  onPartialUpdate?: (partial: Record<string, BusArrival[]>) => void
): Promise<Record<string, BusArrival[]>> {
  const pinnedStops = stops.filter(s => s.category === 'pinned');
  const otherStops = stops.filter(s => s.category !== 'pinned');

  // If progressive callback is provided and we have both pinned and other stops:
  // Fetch pinned ('往屯門') stops FIRST with top priority so they appear in ~300-500ms!
  if (onPartialUpdate && pinnedStops.length > 0 && otherStops.length > 0) {
    const pinnedPromise = fetchETAForStops(pinnedStops).then(pinnedData => {
      onPartialUpdate(pinnedData);
      return pinnedData;
    });

    const otherPromise = fetchETAForStops(otherStops).then(otherData => {
      onPartialUpdate(otherData);
      return otherData;
    });

    const [pinnedData, otherData] = await Promise.all([pinnedPromise, otherPromise]);
    return { ...pinnedData, ...otherData };
  }

  return fetchETAForStops(stops);
}
