/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusArrival {
  route: string;
  destination: string;
  eta: string | null;
  remainingMinutes: number | null;
  remark: string;
}

export interface StopInfo {
  id: string;
  name: string;
  route: string;
  bound: string;
  operator: 'KMB' | 'MTRB' | 'CTB' | 'GMB';
  category?: 'home' | 'pinned' | 'others' | 'kowloon';
  lat?: number;
  lng?: number;
}

export interface CTBETAResponse {
  data: Array<{
    co: string;
    route: string;
    dir: string;
    stop: string;
    seq: number;
    eta: string | null;
    rmk_tc: string;
    rmk_sc: string;
    rmk_en: string;
    data_timestamp: string;
    dest_tc: string;
    dest_sc: string;
    dest_en: string;
  }>;
}

export interface GMBETAResponse {
  data: Array<{
    index: number;
    eta_curr: string;
    eta_next: string;
    eta_next2: string;
    timestamp: string;
    remark_tc: string;
    remark_sc: string;
    remark_en: string;
  }>;
}

export interface KMBETAResponse {
  data: Array<{
    route: string;
    dir: string;
    service_type: number;
    seq: number;
    stop: string;
    dest_tc: string;
    dest_sc: string;
    dest_en: string;
    eta: string | null;
    rmk_tc: string;
    rmk_sc: string;
    rmk_en: string;
    data_timestamp: string;
  }>;
}

export interface MTRBETAResponse {
  busStop: Array<{
    busStopId: string;
    bus: Array<{
      arrivalTimeInSecond: string;
      arrivalTimeText: string;
      departureTimeInSecond: string;
      departureTimeText: string;
      isScheduled: string;
      lineRef: string;
      busRemark?: string | null;
    }>;
  }>;
  routeName: string;
}
