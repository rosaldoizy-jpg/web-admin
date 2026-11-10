/**
 * Single source of truth for laundry order statuses (DB values).
 *
 * Flow (strict, one step at a time):
 * Pending → Received → Washing → Drying → Folding → Ready for Pickup
 * → Out for Delivery → Completed, plus Cancelled from any open step.
 *
 * Display labels use the shop's wording ("Folding / Ironing",
 * "Completed / Delivered"); the database always stores the plain values.
 */
export const LAUNDRY_STATUS_FLOW = [
  'Pending',
  'Received',
  'Washing',
  'Drying',
  'Folding',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
]

export const LAUNDRY_STATUSES = [...LAUNDRY_STATUS_FLOW, 'Cancelled']

export const LAUNDRY_STATUS_LABELS = {
  Pending: 'Pending',
  Received: 'Received',
  Washing: 'Washing',
  Drying: 'Drying',
  Folding: 'Folding / Ironing',
  'Ready for Pickup': 'Ready for Pickup',
  'Out for Delivery': 'Out for Delivery',
  Completed: 'Completed / Delivered',
  Cancelled: 'Cancelled',
}

export const laundryStatusLabel = (status) =>
  LAUNDRY_STATUS_LABELS[status] || status

export const isTerminalLaundryStatus = (status) =>
  status === 'Completed' || status === 'Cancelled'
