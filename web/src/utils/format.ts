export function moneyFromMicroUsd(value: number | null | undefined) {
  return `$${((value ?? 0) / 1_000_000).toFixed(4)}`
}

export function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0)
}

export function dateTime(value: string | null | undefined) {
  if (!value) return '-'
  return value.replace('T', ' ').replace(/\.\d+Z$/, '').replace(/Z$/, '')
}

export function fileSize(bytes: number | null | undefined) {
  const value = bytes ?? 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
