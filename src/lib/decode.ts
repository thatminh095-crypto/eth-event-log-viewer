import type { RpcLog } from './eth'

export const KNOWN_TOPICS: { hash: string; name: string; signature: string }[] = [
  { hash: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', name: 'Transfer', signature: 'Transfer(address,address,uint256)' },
  { hash: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', name: 'Approval', signature: 'Approval(address,address,uint256)' },
]

export function lookupTopic(hash: string): string {
  const hit = KNOWN_TOPICS.find(t => t.hash.toLowerCase() === hash.toLowerCase())
  return hit ? hit.signature : 'Unknown event'
}

export function shortHex(hex: string, head = 6, tail = 4): string {
  if (!hex || hex.length < head + tail + 2) return hex
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`
}

export function hexToAddress(word: string): string {
  return '0x' + word.slice(-40)
}

export function hexToBigInt(word: string): bigint {
  return BigInt(word)
}

export function decodeLog(log: RpcLog): { name: string; from?: string; to?: string; value?: string; raw: string } {
  const topic0 = log.topics[0] ?? ''
  const name = lookupTopic(topic0)
  if (!name.startsWith('Transfer')) return { name, raw: log.data }

  const from = log.topics[1] ? hexToAddress(log.topics[1]) : undefined
  const to = log.topics[2] ? hexToAddress(log.topics[2]) : undefined
  let value: string | undefined
  if (log.data && log.data !== '0x') {
    try {
      value = hexToBigInt(log.data).toString()
    } catch {
      value = log.data
    }
  }
  return { name, from, to, value, raw: log.data }
}

export function buildTopicFilter(input: string): (string | null)[] | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  return parts.map(p => (p === '*' ? null : p))
}