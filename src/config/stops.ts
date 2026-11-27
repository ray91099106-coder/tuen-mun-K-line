/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StopInfo } from '../types';

export interface HomeAreaConfig {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

export const HOME_STOP_AREAS: HomeAreaConfig[] = [
  { name: '虹橋(往置樂方向)', shortName: '虹橋', lat: 22.4025, lng: 113.9778 },
  { name: '新墟(往置樂方向)', shortName: '新墟', lat: 22.3983, lng: 113.9753 },
  { name: '屯門站(往置樂方向)', shortName: '屯門站', lat: 22.3946, lng: 113.9731 },
  { name: '市中心(往置樂方向)', shortName: '市中心', lat: 22.3913, lng: 113.9755 },
  { name: '華都(往置樂方向)', shortName: '華都', lat: 22.3906, lng: 113.9789 },
];

export const HOME_STOP_NAMES: string[] = HOME_STOP_AREAS.map((area) => area.name);

export const HOME_SUGGESTION_RADIUS_METERS = 600;

export const HUANGGANG_REFERENCE_COORDS = {
  tuenMunCore: { lat: 22.3913, lng: 113.9755 },
  huanggangPort: { lat: 22.5218, lng: 114.0725 },
} as const;

/**
 * 港鐵巴士特定站點人工秒數偏移校正（例如扣減 120 秒以貼近實際行車時間）
 * Key 格式：`${stop.id}-${stop.route}`
 */
export const MTRB_STOP_TIME_OFFSETS_SEC: Record<string, number> = {
  'K51-U070,6-K51': -120,
  'K51-U080,7-K51': -120,
};

export const GMB_ROUTE_ID_MAP: Record<string, string> = {
  '140M': '2004598',
  '44B1': '2004197',
  '44B': '2004164',
};

export const GMB_N44B_FALLBACK_ROUTE_ID = '2004165';

export const PINNED_TARGET_ROUTES = ['K51', 'K53', 'K51A', '61M', '52X'] as const;
export const PINNED_MTRB_ROUTES = ['K51', 'K53', 'K51A'] as const;
export const PINNED_KMB_ROUTES = ['61M', '52X'] as const;

export const KOWLOON_TARGET_ROUTES = ['61M', '52X', '140M', '952'] as const;

export const KOWLOON_DEST_HINTS: Record<string, string> = {
  '61M': '荔景(北)',
  '52X': '旺角(柏景灣)',
  '140M': '青衣站',
  '952': '銅鑼灣(摩頓台)',
};

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

  // 回家 (Home) - 站點 0：虹橋
  {
    id: 'K51-U065,6',
    name: '虹橋(往置樂方向)',
    route: 'K51',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    stopSeqDesc: '第6站 景峰花園',
    lat: 22.4032,
    lng: 113.9782,
  },
  {
    id: 'K51A-U060,6',
    name: '虹橋(往置樂方向)',
    route: 'K51A',
    bound: 'U',
    operator: 'MTRB',
    category: 'home',
    stopSeqDesc: '第6站 井財街',
    lat: 22.4020,
    lng: 113.9776,
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
