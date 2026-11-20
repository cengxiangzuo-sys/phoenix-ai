/** Phoenix employee-dispatch admission state. @module */

/**
 * One outstanding employee dispatch per conversation lane. A new claimed inbox
 * message acknowledges the agent's current dispatches and permits the next ones.
 */
export class PhoenixCoordinationGate {
  private readonly pending = new Map<string, Map<string, string>>()

  /**
   * Reserve one employee dispatch for an agent.
   * @param agentId - Agent Session issuing the dispatch.
   * @param lane - Group or direct conversation that must remain serial.
   * @param callId - Tool call that owns the reservation.
   * @returns Whether this call acquired the reservation.
   */
  reserve(agentId: string, lane: string, callId: string): boolean {
    const lanes = this.pending.get(agentId) ?? new Map<string, string>()
    if (lanes.has(lane)) return false
    lanes.set(lane, callId)
    this.pending.set(agentId, lanes)
    return true
  }

  /**
   * Release a failed dispatch without unlocking a successful one early.
   * @param agentId - Agent Session that issued the dispatch.
   * @param lane - Group or direct conversation that owns the dispatch.
   * @param callId - Tool call settling now.
   * @param succeeded - Whether the tool accepted the dispatch.
   */
  settle(agentId: string, lane: string, callId: string, succeeded: boolean): void {
    const lanes = this.pending.get(agentId)
    if (succeeded || lanes?.get(lane) !== callId) return
    lanes.delete(lane)
    if (lanes.size === 0) this.pending.delete(agentId)
  }

  /**
   * Admit the next dispatch after the agent claims a new inbox message.
   * @param agentId - Agent Session receiving the acknowledgement or user input.
   */
  acknowledge(agentId: string): void {
    this.pending.delete(agentId)
  }
}
