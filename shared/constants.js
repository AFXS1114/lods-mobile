// ─── Brand Colors ────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg:       '#0D1117',
  card:     '#161B22',
  surface:  '#21262D',
  border:   '#30363D',

  // Brand
  primary:  '#FF6B35',   // LODS orange
  primaryDim:'#FF6B3520',
  accent:   '#3FB950',   // green (online / success)
  warning:  '#D29922',   // yellow / preparing
  danger:   '#F85149',   // red / cancelled
  info:     '#58A6FF',   // blue / in-transit

  // Text
  text:     '#F0F6FC',
  textMuted:'#8B949E',
  textDim:  '#484F58',
};

// ─── Order Status Values (match lods-terminal exactly) ───────
export const ORDER_STATUS = {
  ASSIGNED:   'assigned',
  PENDING:    'pending',
  IN_TRANSIT: 'in-transit',
  PICKED_UP:  'picked-up',
  DELIVERED:  'delivered',
  CANCELLED:  'cancelled',
};

// ─── Merchant Status Values ───────────────────────────────────
export const MERCHANT_STATUS = {
  PREPARING: 'preparing',
  READY:     'ready',
};

// ─── Rider Status Values (users.status) ──────────────────────
export const RIDER_STATUS = {
  ONLINE:    'online',
  BUSY:      'busy',
  OFFLINE:   'offline',
  SUSPENDED: 'suspended',
};

// ─── GPS Tracking ─────────────────────────────────────────────
export const GPS_INTERVAL_MS = 15000; // update every 15 seconds
export const GPS_TASK_NAME   = 'LODS_GPS_BACKGROUND_TASK';

// ─── Notification Channel ─────────────────────────────────────
export const NOTIF_CHANNEL_ID = 'lods-orders';
