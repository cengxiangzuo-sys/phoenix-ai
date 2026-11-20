/** Official browser brand and Phoenix coordination safety policy. @module */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { PhoenixCoordinationGate } from './phoenix-coordination.ts'

const COORDINATION_TOOLS = new Set(['message_bot', 'post_to_group'])
const BUSY_CODE = 'PHOENIX_COORDINATION_BUSY'
const BUSY_MESSAGE = 'Wait for the current employee reply before assigning the next employee. End this step now; the reply will wake you. 等待当前员工回复后再派发下一位员工。'

function coordinationLane(name: string, args: unknown): string {
  const values = typeof args === 'object' && args !== null ? args as { group?: unknown; to?: unknown } : {}
  const target = name === 'post_to_group' ? values.group : values.to
  return `${name}:${typeof target === 'string' ? target.trim() : ''}`
}

function busyResult(): ToolExecutionResult {
  return {
    content: [{ type: 'text', text: BUSY_MESSAGE }],
    isError: true,
    error: {
      message: BUSY_MESSAGE,
      info: { name: 'PhoenixCoordinationBusyError', code: BUSY_CODE },
    },
  }
}

/**
 * Install the official host-side behavior. Non-Phoenix builds retain the
 * presentation-only package behavior.
 * @param ctx - Cordis context owning the coordination listeners.
 */
export function apply(ctx: Context): void {
  if (process.env.DSH_CLIENT_BRAND !== 'phoenix') return
  const gate = new PhoenixCoordinationGate()

  ctx.on('agent/inbox/claimed', ({ agent }) => {
    gate.acknowledge(agent.id)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    gate.acknowledge(agent.id)
  })
  ctx.on('tools/execute', async (exec, next): Promise<ToolExecutionResult> => {
    const agentId = exec.agent?.id
    if (agentId === undefined || !COORDINATION_TOOLS.has(exec.name)) return next()
    const lane = coordinationLane(exec.name, exec.arguments)
    if (!gate.reserve(agentId, lane, exec.callId)) return busyResult()
    try {
      const result = await next()
      gate.settle(agentId, lane, exec.callId, !result.isError)
      return result
    } catch (error) {
      gate.settle(agentId, lane, exec.callId, false)
      throw error
    }
  })
}
