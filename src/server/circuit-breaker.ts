export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private readonly threshold: number
  private readonly timeout: number

  constructor(threshold = 3, timeout = 60_000) {
    this.threshold = threshold
    this.timeout = timeout
  }

  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure < this.timeout) return true
      this.failures = 0
    }
    return false
  }

  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
  }

  recordSuccess(): void {
    this.failures = 0
  }
}
