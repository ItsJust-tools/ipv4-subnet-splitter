import { describe, it, expect } from 'vitest';
import {
  parseIp,
  intToIp,
  prefixToMask,
  parseCidr,
  parseCount,
  validateSplit,
  prefixForSubnetCount,
  splitNetwork,
  findSubnetIndex,
  splitPlainText,
  splitCsv,
  isState,
  DEFAULT_STATE,
  type ToolState,
  type ParsedNetwork,
  type SubnetInfo,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  roundTrips,
  subnetSplitterTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseIp', () => {
  it('parses valid dotted-decimal addresses', () => {
    expect(parseIp('192.168.1.0')).toBe(0xc0a80100);
    expect(parseIp('0.0.0.0')).toBe(0);
    expect(parseIp('255.255.255.255')).toBe(0xffffffff);
    expect(parseIp('10.0.0.1')).toBe(0x0a000001);
  });

  it('trims whitespace', () => {
    expect(parseIp('  10.0.0.1  ')).toBe(0x0a000001);
  });

  it('rejects invalid addresses', () => {
    expect(parseIp('')).toBeNull();
    expect(parseIp('256.1.1.1')).toBeNull();
    expect(parseIp('1.2.3')).toBeNull();
    expect(parseIp('1.2.3.4.5')).toBeNull();
    expect(parseIp('a.b.c.d')).toBeNull();
    expect(parseIp('01.2.3.4')).toBeNull();
    expect(parseIp('-1.2.3.4')).toBeNull();
  });
});

describe('intToIp round-trip', () => {
  it('reverses parseIp for sample values', () => {
    for (const ip of ['0.0.0.0', '10.0.0.1', '192.168.1.255', '255.255.255.255']) {
      expect(intToIp(parseIp(ip) as number)).toBe(ip);
    }
  });
});

describe('prefixToMask', () => {
  it('produces standard masks', () => {
    expect(prefixToMask(0)).toBe('0.0.0.0');
    expect(prefixToMask(8)).toBe('255.0.0.0');
    expect(prefixToMask(24)).toBe('255.255.255.0');
    expect(prefixToMask(25)).toBe('255.255.255.128');
    expect(prefixToMask(32)).toBe('255.255.255.255');
  });
});

describe('parseCidr', () => {
  it('parses 192.168.1.0/24 correctly', () => {
    const net = parseCidr('192.168.1.0/24');
    expect(net).not.toBeNull();
    if (!net) return;
    expect(net.network).toBe('192.168.1.0');
    expect(net.prefix).toBe(24);
    expect(net.mask).toBe('255.255.255.0');
    expect(net.hosts).toBe(254);
    expect(net.first).toBe('192.168.1.1');
    expect(net.last).toBe('192.168.1.254');
    expect(net.broadcast).toBe('192.168.1.255');
  });

  it('normalizes host bits away (host address input)', () => {
    const net = parseCidr('192.168.1.77/24');
    expect(net?.network).toBe('192.168.1.0');
  });

  it('accepts a bare IP as /32', () => {
    const net = parseCidr('10.0.0.5');
    expect(net?.prefix).toBe(32);
    expect(net?.hosts).toBe(1);
    expect(net?.network).toBe('10.0.0.5');
  });

  it('handles prefix bounds 0 and 32', () => {
    expect(parseCidr('0.0.0.0/0')?.totalAddresses).toBe(2 ** 32);
    expect(parseCidr('10.0.0.1/32')?.hosts).toBe(1);
    expect(parseCidr('10.0.0.1/32')?.broadcast).toBe('—');
  });

  it('handles /31 pair semantics', () => {
    const net = parseCidr('10.0.0.4/31');
    expect(net?.hosts).toBe(2);
    expect(net?.first).toBe('10.0.0.4');
    expect(net?.last).toBe('10.0.0.5');
    expect(net?.broadcast).toBe('—');
  });

  it('rejects invalid inputs', () => {
    expect(parseCidr('')).toBeNull();
    expect(parseCidr('999.0.0.0/24')).toBeNull();
    expect(parseCidr('10.0.0.0/33')).toBeNull();
    expect(parseCidr('not-a-cidr')).toBeNull();
    expect(parseCidr('10.0.0.0/abc')).toBeNull();
  });
});

describe('parseCount', () => {
  it('parses positive integers', () => {
    expect(parseCount('4')).toBe(4);
    expect(parseCount(' 8 ')).toBe(8);
  });
  it('rejects bad values', () => {
    expect(parseCount('')).toBeNull();
    expect(parseCount('0')).toBeNull();
    expect(parseCount('-2')).toBeNull();
    expect(parseCount('2.5')).toBeNull();
    expect(parseCount('abc')).toBeNull();
  });
});

const NET24: ParsedNetwork = parseCidr('192.168.1.0/24') as ParsedNetwork;

describe('validateSplit', () => {
  it('accepts larger prefixes', () => {
    expect(validateSplit(NET24, 25)).toBeNull();
  });

  it('rejects smaller or equal prefixes', () => {
    expect(validateSplit(NET24, 23)).toContain('at least /24');
    expect(validateSplit(NET24, 24)).toContain('already');
  });

  it('rejects prefix above 32', () => {
    expect(validateSplit(NET24, 33)).toContain('/32');
  });

  it('rejects unreasonably large splits', () => {
    const net16 = parseCidr('10.0.0.0/16') as ParsedNetwork;
    const err = validateSplit(net16, 32);
    expect(err).not.toBeNull();
    expect(err).toContain('4096');
  });
});

describe('prefixForSubnetCount', () => {
  it('converts powers of two to prefixes', () => {
    expect(prefixForSubnetCount(NET24, 2)).toBe(25);
    expect(prefixForSubnetCount(NET24, 4)).toBe(26);
    expect(prefixForSubnetCount(NET24, 8)).toBe(27);
    expect(prefixForSubnetCount(NET24, 256)).toBe(32);
  });

  it('returns null for non-powers of two', () => {
    expect(prefixForSubnetCount(NET24, 3)).toBeNull();
    expect(prefixForSubnetCount(NET24, 7)).toBeNull();
    expect(prefixForSubnetCount(NET24, 1)).toBeNull();
  });

  it('returns null when the split does not fit', () => {
    expect(prefixForSubnetCount(NET24, 512)).toBeNull();
  });
});

describe('splitNetwork 192.168.1.0/24 -> /25', () => {
  const subnets = splitNetwork(NET24, 25);

  it('yields exactly two subnets', () => {
    expect(subnets).toHaveLength(2);
  });

  it('computes exact ranges and broadcasts', () => {
    const a = subnets[0] as SubnetInfo;
    const b = subnets[1] as SubnetInfo;
    expect(a.cidr).toBe('192.168.1.0/25');
    expect(a.network).toBe('192.168.1.0');
    expect(a.first).toBe('192.168.1.1');
    expect(a.last).toBe('192.168.1.126');
    expect(a.broadcast).toBe('192.168.1.127');
    expect(a.hosts).toBe(126);
    expect(a.gateway).toBe('192.168.1.1');

    expect(b.cidr).toBe('192.168.1.128/25');
    expect(b.network).toBe('192.168.1.128');
    expect(b.first).toBe('192.168.1.129');
    expect(b.last).toBe('192.168.1.254');
    expect(b.broadcast).toBe('192.168.1.255');
    expect(b.hosts).toBe(126);
  });

  it('indexes subnets from zero', () => {
    expect(subnets.map((s) => s.index)).toEqual([0, 1]);
  });
});

describe('splitNetwork into /26 and /27', () => {
  it('makes four /26s with contiguous ranges', () => {
    const subnets = splitNetwork(NET24, 26);
    expect(subnets).toHaveLength(4);
    expect(subnets.map((s) => s.cidr)).toEqual([
      '192.168.1.0/26',
      '192.168.1.64/26',
      '192.168.1.128/26',
      '192.168.1.192/26',
    ]);
    expect(subnets.every((s) => s.hosts === 62)).toBe(true);
  });

  it('makes eight /27s', () => {
    const subnets = splitNetwork(NET24, 27);
    expect(subnets).toHaveLength(8);
    expect(subnets[7]!.cidr).toBe('192.168.1.224/27');
  });

  it('splits a /8 into /9 correctly', () => {
    const net = parseCidr('10.0.0.0/8') as ParsedNetwork;
    const subnets = splitNetwork(net, 9);
    expect(subnets).toHaveLength(2);
    expect(subnets[1]!.cidr).toBe('10.128.0.0/9');
  });

  it('handles /32 children', () => {
    const net = parseCidr('10.0.0.0/30') as ParsedNetwork;
    const subnets = splitNetwork(net, 32);
    expect(subnets).toHaveLength(4);
    expect(subnets[0]!.hosts).toBe(1);
    expect(subnets[3]!.cidr).toBe('10.0.0.3/32');
    expect(subnets[0]!.broadcast).toBe('—');
  });

  it('handles splitting a /31', () => {
    const net = parseCidr('10.0.0.0/31') as ParsedNetwork;
    const subnets = splitNetwork(net, 32);
    expect(subnets).toHaveLength(2);
    expect(subnets[1]!.cidr).toBe('10.0.0.1/32');
  });
});

describe('findSubnetIndex', () => {
  const subnets = splitNetwork(NET24, 26);

  it('locates the containing subnet', () => {
    expect(findSubnetIndex(subnets, '192.168.1.10')).toBe(0);
    expect(findSubnetIndex(subnets, '192.168.1.64')).toBe(1);
    expect(findSubnetIndex(subnets, '192.168.1.130')).toBe(2);
    expect(findSubnetIndex(subnets, '192.168.1.255')).toBe(3);
  });

  it('returns null for IPs outside the parent network', () => {
    expect(findSubnetIndex(subnets, '192.168.2.1')).toBeNull();
    expect(findSubnetIndex(subnets, '10.0.0.1')).toBeNull();
  });

  it('returns null for invalid IPs', () => {
    expect(findSubnetIndex(subnets, 'not-an-ip')).toBeNull();
  });
});

describe('splitPlainText and splitCsv', () => {
  const subnets = splitNetwork(NET24, 25);

  it('emits a header and one row per subnet', () => {
    const text = splitPlainText(NET24, subnets);
    expect(text).toContain('192.168.1.0/24 split into 2 subnets');
    expect(text).toContain('192.168.1.128/25');
  });

  it('emits CSV with header row', () => {
    const csv = splitCsv(NET24, subnets);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('subnet_cidr');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('192.168.1.0/25');
  });
});

describe('serialize/deserialize', () => {
  it('round-trips a full state', () => {
    const full = state({
      cidr: '10.0.0.0/8',
      newPrefix: '9',
      subnetCount: '',
      lookupIp: '10.1.2.3',
    });
    const restored = deserializeState(JSON.parse(serializeState(full)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(full);
    }
    expect(roundTrips(full)).toBe(true);
  });

  it('round-trips via the Tool object', () => {
    const serialized = subnetSplitterTool.serialize(state());
    const restored = subnetSplitterTool.deserialize(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(state());
    }
  });

  it('rejects malformed payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(undefined).success).toBe(false);
    expect(deserializeState(42).success).toBe(false);
  });

  it('falls back to defaults for missing fields', () => {
    const restored = deserializeState({});
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(DEFAULT_STATE);
    }
  });

  it('repairs non-string fields to defaults', () => {
    const restored = deserializeState({ cidr: 123, lookupIp: true });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.cidr).toBe(DEFAULT_STATE.cidr);
      expect(restored.data.lookupIp).toBe(DEFAULT_STATE.lookupIp);
    }
  });

  it('exposes the tool under the configured id', () => {
    expect(subnetSplitterTool.id).toBe('ipv4-subnet-splitter');
    expect(subnetSplitterTool.exporters).toHaveLength(4);
  });
});

describe('isState', () => {
  it('accepts valid state shapes and rejects garbage', () => {
    expect(isState(state())).toBe(true);
    expect(isState({ cidr: 'x', newPrefix: 'y' })).toBe(true);
    expect(isState(null)).toBe(false);
    expect(isState('nope')).toBe(false);
    expect(isState({})).toBe(false);
  });
});

describe('edge cases and validation errors', () => {
  it('rejects splitting that shrinks the network', () => {
    const net = parseCidr('10.0.0.0/24') as ParsedNetwork;
    expect(validateSplit(net, 16)).toContain('at least /24');
  });

  it('rejects prefix above 32 in parseCidr', () => {
    expect(parseCidr('10.0.0.0/33')).toBeNull();
  });

  it('splits without host bits exhausted errors at /32 boundary', () => {
    const net = parseCidr('10.0.0.0/32') as ParsedNetwork;
    expect(validateSplit(net, 32)).toContain('already');
    const bigger = parseCidr('10.0.0.0/31') as ParsedNetwork;
    expect(splitNetwork(bigger, 32)).toHaveLength(2);
  });
});
