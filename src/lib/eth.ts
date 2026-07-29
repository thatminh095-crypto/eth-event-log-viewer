export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

export interface RpcLog {
  address: string
  blockHash: string
  blockNumber: string
  data: string
  logIndex: string
  transactionHash: string
  transactionIndex: string
  topics: string[]
  removed?: boolean
}

export interface RpcResponse<T> {
  jsonrpc: string
  id: number
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

export interface LogFilter {
  address?: string
  fromBlock: string | number
  toBlock: string | number
  topics?: (string | null | (string | null)[])[]
}

let idCounter = 1

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: idCounter++, method, params }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const json: RpcResponse<T> = await res.json()
  if (json.error) throw new Error(`RPC ${json.error.code}: ${json.error.message}`)
  if (json.result === undefined) throw new Error('RPC returned no result')
  return json.result
}

export async function getBlockNumber(): Promise<number> {
  const hex = await rpc<string>('eth_blockNumber', [])
  return parseInt(hex, 16)
}

export async function getLogs(filter: LogFilter): Promise<RpcLog[]> {
  return rpc<RpcLog[]>('eth_getLogs', [filter])
}

export function isHexAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s)
}

export function toBlockTag(v: string | number): string {
  if (typeof v === 'number') return '0x' + v.toString(16)
  if (v.startsWith('0x')) return v
  const n = parseInt(v, 10)
  if (Number.isFinite(n) && n >= 0) return '0x' + n.toString(16)
  return v
}