/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshControlProps {
  lastUpdated: Date;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

export const RefreshControl: React.FC<RefreshControlProps> = React.memo(({
  lastUpdated,
  loading,
  onRefresh,
}) => (
  <div className="flex items-center gap-2.5">
    <div className="text-right leading-tight">
      <p className="text-[10px] font-semibold text-[#8b95a5]">最後更新</p>
      <p className="text-xs font-mono tabular-nums font-bold text-[#eef2f6]">
        {lastUpdated.toLocaleTimeString()}
      </p>
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRefresh();
      }}
      disabled={loading}
      aria-label="手動更新到站時間"
      className="btn-tactile-secondary p-2 rounded-xl disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={`w-4 h-4 text-[#eef2f6] ${loading ? 'animate-spin' : ''}`} />
    </button>
  </div>
));
