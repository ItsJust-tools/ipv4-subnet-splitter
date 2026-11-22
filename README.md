# IPv4 Subnet Splitter

Split an IPv4 network into equal-sized subnets with per-subnet network/broadcast/gateway/usable-range details and copyable CIDR list.

**Live:** [ipv4-subnet-splitter.itsjust.tools](https://ipv4-subnet-splitter.itsjust.tools)

## Features

- Enter any IPv4 network in CIDR form (e.g. `192.168.1.0/24`) with validation and clear error messages
- Choose the new prefix length or the desired number of subnets (power of two), with feasibility checks (prefix must enlarge, max /32)
- Subnet table showing network address, first/last usable host, broadcast address, gateway and host count per subnet
- Visual block map of the parent network split into child subnets; blocks highlight when they contain a lookup IP
- Find the subnet containing a given IP address with highlight in table and map
- Copyable plain-text and CSV export of the full subnet table
- State persists in the URL so a split can be shared or bookmarked
- Keyboard accessible controls with quick presets (/24 → /25, /26, /27)
- 100% client-side — no data ever leaves your browser

## Usage

1. Enter the parent network in CIDR form.
2. Enter a new prefix (or click a preset) or a number of subnets in the sidebar.
3. Optionally type a lookup IP to highlight the subnet containing it.
4. Copy the table as plain text or CSV, or use the toolbar share/export buttons.

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t ipv4-subnet-splitter .
docker run -p 3000:3000 ipv4-subnet-splitter
```

## License

MIT
