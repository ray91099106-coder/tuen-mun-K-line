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
];

export async function fetchETA(stop: StopInfo): Promise<BusArrival[]> {
  const now = new Date();

  // Both KMB and MTRB data are sourced via Data.gov.hk (transportdata.gov.hk)
  if (stop.operator === 'KMB') {
    try {
      // Use local proxy to bypass CORS
      const response = await fetch(`/api/bus/kmb/${stop.id}`);
      const data: KMBETAResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        console.warn(`KMB API returned no data for stop ${stop.id}`);
        return [];
      }

      // Filter by route and bound
      // Note: KMB ETA API uses 'dir' (O/I)
      const filtered = data.data
        .filter((item) => item.route === stop.route && (item.dir === stop.bound || !stop.bound))
        .sort((a, b) => {
          if (!a.eta) return 1;
          if (!b.eta) return -1;
          return new Date(a.eta).getTime() - new Date(b.eta).getTime();
        })
        .slice(0, 3);

      return filtered.map((item) => {
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
    } catch (error) {
      console.error('KMB API Error:', error);
      return [];
    }
  } else {
    try {
      // Use local proxy to bypass CORS
      const response = await fetch('/api/bus/mtrb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeName: stop.route,
          language: 'zh',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`MTRB API returned status ${response.status}`);
      }

      const data: MTRBETAResponse = await response.json();

      if (!data.busStop || !Array.isArray(data.busStop)) {
        console.warn(`MTRB API returned no data for route ${stop.route}`);
        return [];
      }

      // Find the specific stop (handle comma-separated IDs if provided)
      const stopIdToMatch = stop.id.split(',')[0];
      const stopData = data.busStop.find((s) => s.busStopId === stopIdToMatch);
      
      if (!stopData || !stopData.bus || !Array.isArray(stopData.bus)) {
        console.warn(`MTRB API: Stop ${stop.id} not found in route ${stop.route}`);
        return [];
      }

      // Map to BusArrival[]
      return stopData.bus.map((item) => {
        let remainingMinutes = item.departureTimeInSecond 
          ? Math.floor(parseInt(item.departureTimeInSecond) / 60) 
          : 0;
        
        // Apply user-requested offsets: 新墟 K51 (-2m), 屯門站 K51 (-2m)
        if (stop.route === 'K51') {
          if (stop.id === 'K51-U070,6' || stop.id === 'K51-U080,7') {
            remainingMinutes = Math.max(0, remainingMinutes - 2);
          }
        }
        
        // Determine destination based on route and lineRef
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
    } catch (error) {
      console.error('MTRB API Error:', error);
      return [];
    }
  }
}
