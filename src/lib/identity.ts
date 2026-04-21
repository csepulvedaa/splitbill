'use client'

const KEY = 'splitbill_device_id'

/** Returns a stable anonymous device ID, creating one on first call. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
