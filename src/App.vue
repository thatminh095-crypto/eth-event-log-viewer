<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type RpcLog, getBlockNumber, getLogs, isHexAddress, toBlockTag } from './lib/eth'
import { KNOWN_TOPICS, buildTopicFilter, decodeLog, shortHex } from './lib/decode'

const address = ref('')
const topicsCsv = ref('')
const fromBlock = ref('')
const toBlock = ref('')
const rangeMode = ref<'latest' | 'range'>('latest')

const logs = ref<RpcLog[]>([])
const loading = ref(false)
const error = ref('')
const headBlock = ref<number | null>(null)
const lastQuery = ref<{ ms: number; count: number } | null>(null)

const addressValid = computed(() => !address.value.trim() || isHexAddress(address.value.trim()))

async function ensureHead() {
  if (headBlock.value === null) {
    headBlock.value = await getBlockNumber()
  }
}

function presetRange(size: number) {
  if (headBlock.value === null) return
  toBlock.value = String(headBlock.value)
  fromBlock.value = String(Math.max(0, headBlock.value - size + 1))
  rangeMode.value = 'range'
}

async function useLatest() {
  rangeMode.value = 'latest'
  await ensureHead()
  if (headBlock.value !== null) {
    toBlock.value = String(headBlock.value)
    fromBlock.value = String(Math.max(0, headBlock.value - 99))
  }
}

async function fetchLogs() {
  error.value = ''
  if (!address.value.trim()) {
    error.value = 'Contract address required'
    return
  }
  if (!isHexAddress(address.value.trim())) {
    error.value = 'Invalid address (need 0x + 40 hex chars)'
    return
  }
  await ensureHead()

  const fb = rangeMode.value === 'latest'
    ? Math.max(0, headBlock.value! - 99)
    : parseInt(fromBlock.value, 10)
  const tb = rangeMode.value === 'latest'
    ? headBlock.value!
    : parseInt(toBlock.value, 10)

  if (!Number.isFinite(fb) || !Number.isFinite(tb) || fb < 0 || tb < fb) {
    error.value = 'Block range invalid: fromBlock must be ≤ toBlock, both ≥ 0'
    return
  }
  if (tb - fb > 10000) {
    error.value = 'Range too large (max 10000 blocks per request)'
    return
  }

  const topics = buildTopicFilter(topicsCsv.value)
  const filter = {
    address: address.value.trim(),
    fromBlock: toBlockTag(fb),
    toBlock: toBlockTag(tb),
    ...(topics ? { topics } : {}),
  }

  loading.value = true
  const t0 = performance.now()
  try {
    logs.value = await getLogs(filter)
    lastQuery.value = { ms: Math.round(performance.now() - t0), count: logs.value.length }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await ensureHead()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

function pickTopic(hash: string) {
  topicsCsv.value = hash
}

function clearAll() {
  address.value = ''
  topicsCsv.value = ''
  logs.value = []
  error.value = ''
  lastQuery.value = null
}
</script>

<template>
  <div class="app">
    <header class="hdr">
      <h1>Ethereum Event Log Viewer</h1>
      <p class="sub">
        Read-only <code>eth_getLogs</code> over Sepolia testnet
        <span v-if="headBlock !== null" class="badge">head {{ headBlock.toLocaleString() }}</span>
      </p>
    </header>

    <section class="card">
      <div class="row">
        <label>
          Contract address
          <input
            v-model="address"
            placeholder="0x…"
            spellcheck="false"
            autocomplete="off"
            :class="{ invalid: !addressValid }"
          />
        </label>
      </div>

      <div class="row two">
        <label>
          Topics (CSV, * for any)
          <input v-model="topicsCsv" placeholder="0xddf252ad… or leave empty" spellcheck="false" />
        </label>
      </div>

      <div class="row">
        <div class="seg">
          <button :class="{ active: rangeMode === 'latest' }" @click="useLatest">Last 100 blocks</button>
          <button :class="{ active: rangeMode === 'range' }" @click="rangeMode = 'range'">Custom range</button>
        </div>
      </div>

      <div v-if="rangeMode === 'range'" class="row two">
        <label>
          fromBlock
          <input v-model="fromBlock" placeholder="9000000" inputmode="numeric" />
        </label>
        <label>
          toBlock
          <input v-model="toBlock" placeholder="9000100" inputmode="numeric" />
        </label>
        <div class="presets">
          <button @click="presetRange(10)">+10</button>
          <button @click="presetRange(100)">+100</button>
          <button @click="presetRange(1000)">+1k</button>
          <button @click="presetRange(10000)">+10k</button>
        </div>
      </div>

      <div class="actions">
        <button class="primary" :disabled="loading" @click="fetchLogs">
          {{ loading ? 'Fetching…' : 'Fetch logs' }}
        </button>
        <button class="ghost" :disabled="loading" @click="clearAll">Clear</button>
      </div>

      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section v-if="lastQuery" class="meta">
      <span>{{ lastQuery.count }} log{{ lastQuery.count === 1 ? '' : 's' }}</span>
      <span>·</span>
      <span>{{ lastQuery.ms }} ms</span>
    </section>

    <section class="card">
      <h2>Common topics</h2>
      <div class="chips">
        <button
          v-for="t in KNOWN_TOPICS"
          :key="t.hash"
          class="chip"
          :title="t.hash"
          @click="pickTopic(t.hash)"
        >
          {{ t.name }}
          <span class="chip-hash">{{ shortHex(t.hash) }}</span>
        </button>
        <button class="chip" @click="topicsCsv = ''">any</button>
      </div>
    </section>

    <section v-if="logs.length > 0" class="card">
      <h2>Results ({{ logs.length }})</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Block</th>
              <th>Event</th>
              <th>From</th>
              <th>To</th>
              <th>Value</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="`${log.transactionHash}-${log.logIndex}`">
              <td>{{ parseInt(log.blockNumber, 16).toLocaleString() }}</td>
              <td>
                <code :title="log.topics[0]">{{ decodeLog(log).name }}</code>
              </td>
              <td v-if="decodeLog(log).from">
                <code :title="decodeLog(log).from">{{ shortHex(decodeLog(log).from!) }}</code>
              </td>
              <td v-else>—</td>
              <td v-if="decodeLog(log).to">
                <code :title="decodeLog(log).to">{{ shortHex(decodeLog(log).to!) }}</code>
              </td>
              <td v-else>—</td>
              <td>
                <span v-if="decodeLog(log).value">{{ decodeLog(log).value }}</span>
                <span v-else class="muted">{{ shortHex(log.data, 10, 8) }}</span>
              </td>
              <td>
                <code :title="log.transactionHash">{{ shortHex(log.transactionHash) }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="!loading && !error" class="card empty">
      <p>No logs loaded yet. Pick a contract address above and click <strong>Fetch logs</strong>.</p>
      <p class="muted small">
        Tip: Sepolia USDC = <code>0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238</code>.
        Try fetching its <code>Transfer</code> events over the last 1000 blocks.
      </p>
    </section>
  </div>
</template>