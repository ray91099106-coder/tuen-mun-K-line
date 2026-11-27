/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusArrival {
  route: string;
  destination: string;
  eta: string | null;
  etaTimestampMs?: number;
  remainingMinutes: number | null;
  remark: string;
  isScheduled?: boolean;
  isDelayed?: boolean;
  statusRemark?: string;
}

export interface StopInfo {
  id: string;
  name: string;
  route: string;
  bound: string;
  operator: 'KMB' | 'MTRB' | 'CTB' | 'GMB';
  category?: 'home' | 'pinned' | 'others' | 'kowloon' | 'shenzhen' | 'huanggang';
  subCategory?: 'to_port' | 'from_port';
  stopSeqDesc?: string;
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

export type SectionCategory = 'pinned' | 'home' | 'kowloon' | 'shenzhen' | 'huanggang';

export type KeyStatus = 'ok' | 'delayed' | 'error';

export interface RouteTimerTrigger {
  route: string;
  minutes: number;
  etaTimestampMs?: number;
  isNextBus?: boolean;
  originalMinutes?: number;
  timestamp: number;
}

export interface GMBETAArrivalItem {
  eta_seq?: number;
  diff?: number;
  timestamp: string;
  remarks_tc: string | null;
  remarks_sc: string | null;
  remarks_en: string | null;
}

export interface GMBETARouteSeqData {
  route_seq: number;
  stop_seq?: number;
  enabled?: boolean;
  eta: GMBETAArrivalItem[];
  description_tc?: string;
  description_sc?: string;
  description_en?: string;
}

export interface GMBETAResponse {
  type?: string;
  version?: string;
  generated_timestamp?: string;
  data: GMBETARouteSeqData[];
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
    isSuspended?: string | null;
    busStopRemark?: string | null;
    busStopStatusRemarkTitle?: string | null;
    bus: Array<{
      arrivalTimeInSecond: string;
      arrivalTimeText: string;
      departureTimeInSecond: string;
      departureTimeText: string;
      isScheduled: string;
      isDelayed?: string;
      lineRef: string;
      busRemark?: string | null;
    }>;
  }>;
  routeName: string;
  routeStatus?: string | null;
  routeStatusRemarkTitle?: string | null;
  routeStatusRemarkContent?: string | null;
}
