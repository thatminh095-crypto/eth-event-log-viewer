# Ethereum Event Log Viewer

Read-only browser tool for fetching event logs from the Ethereum **Sepolia** testnet via the JSON-RPC `eth_getLogs` method. No wallet, no signing — just an HTTP POST.

Built with **Vite + Vue 3 + TypeScript** (single-file components).

## Stack

- **Vite 6** — dev server + production bundler
- **Vue 3.5** — `<script setup>` SFCs
- **TypeScript 5.6** — strict mode, `vue-tsc` for type checking
- **Plain `fetch`** — no Web3 SDK, no wallet provider

## Folder structure

```
eth-event-log-viewer/
├── .npmrc                  # pnpm config
├── index.html              # Vite entry HTML
├── package.json
├── tsconfig.json           # TS config for src/
├── tsconfig.node.json      # TS config for vite.config.ts
├── vite.config.ts
├── README.md
└── src/
    ├── main.ts             # App bootstrap
    ├── App.vue             # Root component (form + results)
    ├── style.css           # Global styles
    ├── env.d.ts            # Vite/Vue ambient types
    └── lib/
        ├── eth.ts          # JSON-RPC client, filter helpers
        └── decode.ts       # topic0 lookup, address/int decoders
```

## Testnet endpoint

The app talks to the public Sepolia RPC:

```
https://ethereum-sepolia-rpc.publicnode.com
```

Configured in `src/lib/eth.ts` as `RPC_URL`. Requests are plain `POST` with a JSON-RPC 2.0 body.

## Run

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # type-check + production bundle into dist/
pnpm preview   # serve the dist/ build
```

Requires **pnpm** (no other package manager supported).

## Usage

1. Paste a contract address (0x + 40 hex chars).
2. Optionally paste topic filters — CSV, `*` for any. Click a chip to pick a common one (`Transfer`, `Approval`).
3. Choose block range:
   - **Last 100 blocks** (default) — fetched automatically from `eth_blockNumber`
   - **Custom range** — type `fromBlock` / `toBlock` or click a preset (+10 / +100 / +1k / +10k)
4. Hit **Fetch logs**. Max range per request is 10000 blocks (publicnode limit).
5. Results table shows block, decoded event name, from/to addresses, value, and tx hash.

### Try it

Sepolia USDC contract:
```
0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```
Filter `Transfer` over the last 1000 blocks to see live testnet activity.

## What it covers

- `eth_blockNumber` — fetch current head on mount
- `eth_getLogs` — address + topic[0..3] + block range filter
- Loading + error states (network, RPC error, validation)
- Topic0 → event name lookup (`Transfer`, `Approval`); other events show as `Unknown event` with raw topic hash
- Address & uint256 decoding for known event signatures

## Limitations

- Read-only; no transaction submission
- No ABI upload — only built-in topic0→name mapping. Unknown events display their `topics[0]` hash
- Public RPC; subject to rate limits and 10000-block range cap