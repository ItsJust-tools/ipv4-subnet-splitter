import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import { DEFAULT_STATE, parseCount, type ToolState } from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    cidr: state.cidr,
    newPrefix: state.newPrefix,
    subnetCount: state.subnetCount,
    lookupIp: state.lookupIp,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected IPv4 Subnet Splitter state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    cidr: stringOr(v.cidr, DEFAULT_STATE.cidr),
    newPrefix: stringOr(v.newPrefix, DEFAULT_STATE.newPrefix),
    subnetCount: stringOr(v.subnetCount, DEFAULT_STATE.subnetCount),
    lookupIp: stringOr(v.lookupIp, DEFAULT_STATE.lookupIp),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/**
 * Resolve the effective new prefix from state.
 * Returns an error message when infeasible; null means "no valid split configured".
 */
export function resolveNewPrefix(
  netPrefix: number,
  newPrefixInput: string,
  subnetCountInput: string
): { prefix: number | null; count: number | null; error: string | null } {
  const count = parseCount(subnetCountInput);
  if (count !== null) {
    if (count < 2) {
      return {
        prefix: null,
        count,
        error: 'Number of subnets must be a power of two and at least 2.',
      };
    }
    if ((count & (count - 1)) !== 0) {
      return {
        prefix: null,
        count,
        error: `Number of subnets must be a power of two (2, 4, 8, …); ${count} is not.`,
      };
    }
    const bits = Math.log2(count);
    const prefix = netPrefix + bits;
    if (prefix > 32) {
      return {
        prefix: null,
        count,
        error: `Cannot split into ${count} subnets: prefix would exceed /32.`,
      };
    }
    return { prefix, count, error: null };
  }
  const prefix = parseCount(newPrefixInput);
  if (prefix === null) return { prefix: null, count: null, error: null };
  if (prefix < netPrefix) {
    return {
      prefix,
      count: null,
      error: `New prefix must be at least /${netPrefix}; /${prefix} is smaller than the parent network.`,
    };
  }
  if (prefix > 32) {
    return { prefix, count: null, error: 'Prefix cannot exceed /32.' };
  }
  return { prefix, count: null, error: null };
}

export const subnetSplitterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
