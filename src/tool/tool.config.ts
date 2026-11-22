import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: 'ipv4-subnet-splitter',
  name: 'IPv4 Subnet Splitter',
  description:
    'Split an IPv4 network into equal-sized subnets with per-subnet network/broadcast/gateway/usable-range details and copyable CIDR list.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'IPv4 Subnet Splitter',
    icon: '\u{1F310}',
  },
  shortcuts: [
    {
      title: 'IPv4 Subnet Splitter',
      shortcuts: [
        { keys: 'Ctrl+Shift+E', label: 'Export All', description: 'exports all formats at once' },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
