'use client';

import React from 'react';
import {
  parseCidr,
  splitPlainText,
  splitCsv,
  intToIp,
  type ToolState,
  type SubnetInfo,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  subnets: SubnetInfo[];
  selected: number | null;
  lookupIndex: number | null;
  error: string | null;
}

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({
  state,
  onChange,
  subnets,
  selected,
  lookupIndex,
  error,
}) => {
  const net = parseCidr(state.cidr);
  const update = (patch: Partial<typeof state>) => onChange?.({ ...state, ...patch });

  return (
    <div className="h-full space-y-6 overflow-y-auto p-4" data-testid="subnet-canvas">
      {error ? (
        <div
          role="alert"
          data-testid="split-error"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {net ? (
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          data-testid="parent-card"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Parent network
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm">
            <span data-testid="parent-network">
              {net.network}/{net.prefix}
            </span>
            <span data-testid="parent-mask">Mask: {net.mask}</span>
            <span data-testid="parent-hosts">Usable hosts: {net.hosts.toLocaleString()}</span>
            <span data-testid="parent-range">
              {net.prefix >= 31 ? '—' : `${net.first} – ${net.last}`}
            </span>
            <span data-testid="parent-broadcast">Broadcast: {net.broadcast}</span>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          data-testid="cidr-error"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
        >
          Enter a valid IPv4 network in CIDR form, e.g. 192.168.1.0/24.
        </div>
      )}

      <label
        className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300"
        htmlFor="input-lookup-ip"
      >
        Find subnet containing IP
        <input
          id="input-lookup-ip"
          type="text"
          value={state.lookupIp}
          onChange={(e) => update({ lookupIp: e.target.value })}
          placeholder="192.168.1.130"
          data-testid="input-lookup-ip"
          className="w-48 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </label>

      {subnets.length > 0 ? (
        <>
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
            data-testid="block-map"
            aria-label="Visual map of child subnets"
          >
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subnet map
            </h3>
            <div className="flex flex-wrap gap-1">
              {subnets.map((s, i) => {
                const isLookup = lookupIndex === s.index;
                const isSelected = selected === s.index;
                return (
                  <button
                    key={s.cidr}
                    type="button"
                    title={`${s.cidr} — ${s.rangeText}`}
                    onClick={() => update({ lookupIp: s.network })}
                    data-testid={`block-${i}`}
                    className={`rounded border px-2 py-1 font-mono text-[10px] ${
                      isLookup
                        ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                        : isSelected
                          ? 'border-sky-500 bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                    }`}
                  >
                    {s.cidr}
                  </button>
                );
              })}
            </div>
            {error === null && lookupIndex !== null ? (
              <p
                className="mt-2 text-xs text-gray-500 dark:text-gray-400"
                data-testid="lookup-note"
              >
                Highlighted block contains {state.lookupIp.trim()}
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto" data-testid="subnet-table">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    CIDR
                  </th>
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    Network
                  </th>
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    First host
                  </th>
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    Last host
                  </th>
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    Broadcast
                  </th>
                  <th className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                    Hosts
                  </th>
                </tr>
              </thead>
              <tbody>
                {subnets.map((s, i) => (
                  <tr
                    key={s.cidr}
                    data-testid={`subnet-row-${i}`}
                    className={
                      lookupIndex === s.index
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : selected === s.index
                          ? 'bg-sky-50 dark:bg-sky-900/20'
                          : ''
                    }
                  >
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.cidr}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.network}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.first}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.last}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.broadcast}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-1.5 font-mono dark:border-gray-800/50">
                      {s.hosts.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : error === null && net ? (
        <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="no-split">
          Choose a new prefix to see subnets.
        </p>
      ) : null}

      {subnets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="export-actions">
          <CopyButton
            value={splitPlainText(net ?? ({ networkInt: 0 } as never), subnets)}
            testid="btn-copy-text"
          />
          <CopyButton
            value={splitCsv(
              {
                network: net ? net.network : intToIp(0),
                prefix: net ? net.prefix : 0,
              } as never,
              subnets
            )}
            testid="btn-copy-csv"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">Copy as text / CSV</span>
        </div>
      ) : null}
    </div>
  );
};
