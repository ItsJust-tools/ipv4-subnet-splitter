'use client';

import React from 'react';
import { summaryText } from '../ui-shared';
import type { ToolState, SubnetInfo } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  subnets: SubnetInfo[];
  selected: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange, subnets, selected }) => {
  const subnet = selected !== null ? subnets.find((s) => s.index === selected) : undefined;
  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 text-sm" data-testid="subnet-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Selected subnet</h3>
        {subnet ? (
          <dl className="space-y-1 text-xs" data-testid="sidebar-subnet-details">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">CIDR</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{subnet.cidr}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Network</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{subnet.network}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Gateway</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">
                {subnet.gateway ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">First usable</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{subnet.first}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Last usable</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{subnet.last}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Broadcast</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{subnet.broadcast}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Usable hosts</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">
                {subnet.hosts.toLocaleString()}
              </dd>
            </div>
          </dl>
        ) : (
          <p
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="sidebar-no-selection"
          >
            Select a block in the subnet map or enter a lookup IP to inspect a subnet.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Summary</h3>
        <p
          className="break-all font-mono text-xs text-gray-600 dark:text-gray-300"
          data-testid="sidebar-summary"
        >
          {summaryText(state)}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Subnet count</h3>
        <label
          className="block text-xs text-gray-600 dark:text-gray-300"
          htmlFor="input-subnet-count"
        >
          Number of subnets (power of two)
          <input
            id="input-subnet-count"
            type="text"
            value={state.subnetCount}
            onChange={(e) => onChange({ ...state, subnetCount: e.target.value })}
            placeholder="e.g. 8"
            data-testid="input-subnet-count"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Leave empty to drive the split from the new prefix instead.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>Ctrl+Shift+E</kbd> — Export all formats
          </li>
          <li>
            <kbd>Ctrl+B</kbd> — Toggle sidebar
          </li>
          <li>
            <kbd>Ctrl+D</kbd> — Toggle dark mode
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current split; open it to
          restore this exact subnet plan.
        </p>
      </div>
    </div>
  );
};
