// ─── Brand Colors ────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg:       '#FFFFFF',   // White background
  card:     '#F5F5F7',   // Slight off-white for cards
  surface:  '#FFFFFF',
  border:   '#EAEAEA',

  // Brand (LODS Logo Colors)
  primary:  '#9A66FF',   // Primary Purple
  primaryDim:'#9A66FF20',
  secondary:'#F9D96F',   // Secondary Yellow
  accent:   '#E6A23C',   // Accent Orange

  // Semantic
  success:  '#3FB950',
  warning:  '#E6A23C',   // Reusing orange for warning
  danger:   '#F85149',
  info:     '#58A6FF',

  // Text
  text:     '#210F0A',   // Text Dark
  textMuted:'#6B7280',
  textDim:  '#9CA3AF',
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
