export interface HostRange {
  /** Network address of the subnet. */
  network: string;
  /** First usable host address ('—' for /31, /32). */
  first: string;
  /** Last usable host address ('—' for /31, /32). */
  last: string;
  /** Broadcast address ('—' for /31, /32). */
  broadcast: string;
  /** Number of usable host addresses. */
  hosts: number;
  /** Usable host range as text ('—' when none). */
  rangeText: string;
}

export interface SubnetInfo extends HostRange {
  /** Index of this subnet within the split. */
  index: number;
  /** CIDR notation, e.g. 192.168.1.0/25. */
  cidr: string;
  /** Prefix length of this subnet. */
  prefix: number;
  /** Conventional gateway address (first usable host; null when none). */
  gateway: string | null;
}

export interface ParsedNetwork {
  /** Base network IPv4 in dotted-decimal form. */
  network: string;
  /** Prefix length 0-32. */
  prefix: number;
  /** Dotted-decimal subnet mask. */
  mask: string;
  /** Number of host bits (32 - prefix). */
  hostBits: number;
  /** Total addresses in the network (2 ** hostBits). */
  totalAddresses: number;
  /** Usable host count (2**hostBits - 2; 2 for /31, 1 for /32). */
  hosts: number;
  /** First usable host address ('—' for /31, /32). */
  first: string;
  /** Last usable host address ('—' for /31, /32). */
  last: string;
  /** Broadcast address ('—' for /31, /32). */
  broadcast: string;
  /** Network address as an unsigned 32-bit integer. */
  networkInt: number;
}

export interface ToolState {
  /** Parent network in CIDR form, e.g. 192.168.1.0/24. */
  cidr: string;
  /** New prefix length for the child subnets, or '' when unspecified. */
  newPrefix: string;
  /** Desired number of subnets, or '' when unspecified. */
  subnetCount: string;
  /** IP address to look up within the split, or '' when unset. */
  lookupIp: string;
}

export const DEFAULT_STATE: ToolState = {
  cidr: '192.168.1.0/24',
  newPrefix: '25',
  subnetCount: '',
  lookupIp: '',
};

const MAX_SPLIT_SUBNETS = 4096;

/** Parse an integer text field; returns null for empty/unparseable input. */
export function parseCount(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

/** Parse a dotted-decimal IPv4 address; returns null when invalid. */
export function parseIp(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) return null;
  const parts = trimmed.split('.');
  let value = 0;
  for (const part of parts) {
    if (part.length > 1 && part.startsWith('0')) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

/** Format an unsigned 32-bit integer as dotted-decimal IPv4. */
export function intToIp(value: number): string {
  const v = value >>> 0;
  return `${(v >>> 24) & 255}.${(v >>> 16) & 255}.${(v >>> 8) & 255}.${v & 255}`;
}

/** Dotted-decimal subnet mask for a prefix 0-32. */
export function prefixToMask(prefix: number): string {
  return intToIp(prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);
}

/** Parse a CIDR string like 192.168.1.0/24 (plain IP defaults to /32). */
export function parseCidr(input: string): ParsedNetwork | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = /^([^/]+)(\/(\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const ip = parseIp(match[1] ?? '');
  if (ip === null) return null;
  let prefix = 32;
  if (match[3] !== undefined) {
    prefix = Number(match[3]);
    if (prefix > 32) return null;
  }
  const shift = 32 - prefix;
  const maskInt = prefix === 0 ? 0 : (0xffffffff << shift) >>> 0;
  const networkInt = (ip & maskInt) >>> 0;
  const hostBits = 32 - prefix;
  const totalAddresses = 2 ** hostBits;
  let hosts: number;
  let first: string;
  let last: string;
  let broadcast: string;
  if (prefix === 32) {
    hosts = 1;
    first = intToIp(networkInt);
    last = first;
    broadcast = '—';
  } else if (prefix === 31) {
    hosts = 2;
    first = intToIp(networkInt);
    last = intToIp(networkInt + 1);
    broadcast = '—';
  } else {
    hosts = totalAddresses - 2;
    first = intToIp(networkInt + 1);
    last = intToIp(networkInt + totalAddresses - 2);
    broadcast = intToIp(networkInt + totalAddresses - 1);
  }
  return {
    network: intToIp(networkInt),
    prefix,
    mask: prefixToMask(prefix),
    hostBits,
    totalAddresses,
    hosts,
    first,
    last,
    broadcast,
    networkInt,
  };
}

/** Validate a desired split: returns an error message on failure. */
export function validateSplit(net: ParsedNetwork, newPrefix: number): string | null {
  if (!Number.isInteger(newPrefix) || newPrefix < net.prefix) {
    return `New prefix must be at least /${net.prefix} (splitting can only make subnets smaller).`;
  }
  if (newPrefix > 32) {
    return 'New prefix cannot exceed /32.';
  }
  const count = 2 ** (newPrefix - net.prefix);
  if (count > MAX_SPLIT_SUBNETS) {
    return `Splitting into ${count} subnets exceeds the limit of ${MAX_SPLIT_SUBNETS} subnets.`;
  }
  if (newPrefix === net.prefix) {
    return `The network is already at /${net.prefix}; choose a larger prefix to split it.`;
  }
  return null;
}

/** Convert a desired number of subnets to the required new prefix; null when impossible. */
export function prefixForSubnetCount(net: ParsedNetwork, count: number): number | null {
  if (!Number.isInteger(count) || count < 2) return null;
  const bits = Math.ceil(Math.log2(count));
  const power = 2 ** bits;
  if (power !== count) return null;
  const prefix = net.prefix + bits;
  if (prefix > 32 || 2 ** (prefix - net.prefix) > MAX_SPLIT_SUBNETS) return null;
  return prefix;
}

/**
 * Split a parsed network into `2 ** (newPrefix - prefix)` equal subnets.
 * The caller must validate with validateSplit first.
 */
export function splitNetwork(net: ParsedNetwork, newPrefix: number): SubnetInfo[] {
  const childHostBits = 32 - newPrefix;
  const childSize = 2 ** childHostBits;
  const count = 2 ** (newPrefix - net.prefix);
  const subnets: SubnetInfo[] = [];
  for (let i = 0; i < count; i++) {
    const networkInt = (net.networkInt + i * childSize) >>> 0;
    let first: string;
    let last: string;
    let broadcast: string;
    let hosts: number;
    let rangeText: string;
    if (newPrefix === 32) {
      hosts = 1;
      first = intToIp(networkInt);
      last = first;
      broadcast = '—';
      rangeText = first;
    } else if (newPrefix === 31) {
      hosts = 2;
      first = intToIp(networkInt);
      last = intToIp(networkInt + 1);
      broadcast = '—';
      rangeText = `${first} – ${last}`;
    } else {
      hosts = childSize - 2;
      first = intToIp(networkInt + 1);
      last = intToIp(networkInt + childSize - 2);
      broadcast = intToIp(networkInt + childSize - 1);
      rangeText = `${first} – ${last}`;
    }
    subnets.push({
      index: i,
      cidr: `${intToIp(networkInt)}/${newPrefix}`,
      prefix: newPrefix,
      network: intToIp(networkInt),
      first,
      last,
      broadcast,
      hosts,
      rangeText,
      gateway: newPrefix >= 32 ? null : first,
    });
  }
  return subnets;
}

/** Find the index of the subnet containing the given IP, or null when outside. */
export function findSubnetIndex(subnets: SubnetInfo[], ip: string): number | null {
  const ipInt = parseIp(ip);
  if (ipInt === null) return null;
  for (const subnet of subnets) {
    const networkInt = parseIp(subnet.network);
    if (networkInt === null) continue;
    const childSize = 2 ** (32 - subnet.prefix);
    if (ipInt >= networkInt && ipInt < networkInt + childSize) return subnet.index;
  }
  return null;
}

/** Plain-text summary of the split for copy/export. */
export function splitPlainText(net: ParsedNetwork, subnets: SubnetInfo[]): string {
  const header = [
    `${net.network}/${net.prefix} split into ${subnets.length} subnets (/${subnets[0]?.prefix ?? net.prefix})`,
    'CIDR\t\tNetwork\t\tFirst host\tLast host\tBroadcast\tHosts',
  ];
  const rows = subnets.map(
    (s) => `${s.cidr}\t${s.network}\t${s.first}\t${s.last}\t${s.broadcast}\t${s.hosts}`
  );
  return [...header, ...rows].join('\n');
}

/** CSV export of the full subnet table. */
export function splitCsv(net: ParsedNetwork, subnets: SubnetInfo[]): string {
  const lines = [
    `network_cidr,subnet_cidr,subnet_index,network_address,first_usable,last_usable,broadcast,host_count,mask`,
  ];
  const parentMask = prefixToMask(net.prefix);
  for (const s of subnets) {
    lines.push(
      [
        `${net.network}/${net.prefix}`,
        s.cidr,
        String(s.index),
        s.network,
        s.first,
        s.last,
        s.broadcast,
        String(s.hosts),
        prefixToMask(s.prefix),
      ].join(',') + (parentMask ? '' : '')
    );
  }
  return lines.join('\n');
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.cidr === 'string' && typeof v.newPrefix === 'string';
}
