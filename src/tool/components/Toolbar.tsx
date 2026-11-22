'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

const inputClass =
  'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      role="group"
      aria-label="IPv4 Subnet Splitter controls"
    >
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        Network (CIDR)
        <input
          type="text"
          value={state.cidr}
          onChange={(e) => onChange({ ...state, cidr: e.target.value })}
          placeholder="192.168.1.0/24"
          data-testid="input-cidr"
          aria-label="Parent network in CIDR notation"
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        New prefix
        <input
          type="text"
          value={state.newPrefix}
          onChange={(e) => onChange({ ...state, newPrefix: e.target.value })}
          placeholder="25"
          data-testid="input-new-prefix"
          aria-label="New prefix length"
          className={`${inputClass} w-16`}
        />
      </label>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Prefix presets"
        data-testid="prefix-presets"
      >
        {[
          { v: '25', l: '/25' },
          { v: '26', l: '/26' },
          { v: '27', l: '/27' },
        ].map((p) => (
          <button
            key={p.v}
            type="button"
            data-testid={`preset-${p.l.slice(1)}`}
            onClick={() => onChange({ ...state, newPrefix: p.v })}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          >
            {p.l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        data-testid="btn-clear"
        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Reset
      </button>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          data-testid="btn-copy-result"
          className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
        >
          Copy summary
        </button>
      ) : null}
    </div>
  );
};
