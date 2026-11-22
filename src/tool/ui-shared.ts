import type { ToolState } from './types';

export const PRESETS: { value: string; label: string }[] = [
  { value: '1', label: '/25' },
  { value: '2', label: '/26' },
  { value: '3', label: '/27' },
];

/** Human-readable summary line for the current state (used by status bar and copy). */
export function summaryText(state: ToolState): string {
  const bits = [state.cidr.trim() || 'no network'];
  if (state.newPrefix.trim()) bits.push(`new prefix /${state.newPrefix.trim()}`);
  if (state.subnetCount.trim()) bits.push(`${state.subnetCount.trim()} subnets`);
  if (state.lookupIp.trim()) bits.push(`lookup ${state.lookupIp.trim()}`);
  return bits.join(' · ');
}
