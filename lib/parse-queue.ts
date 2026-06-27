export function normalizeQueueRef(input: string): string {
  let value = input.trim().toUpperCase()

  if (value.startsWith("Q")) {
    value = value.replace(/^Q-?/, "")
    return `Q-${value}`
  }

  return value
}