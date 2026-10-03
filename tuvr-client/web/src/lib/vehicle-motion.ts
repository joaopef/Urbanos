export interface MotionPosition { lat: number; lon: number; }

const DEFAULT_INTERVAL_MS = 5_000;
const MIN_DURATION_MS = 1_000;
const MAX_DURATION_MS = 5_000;
const MAX_ANIMATION_GAP_MS = 30_000;
const MAX_ANIMATION_DISTANCE_M = 500;
const GPS_JITTER_METERS = 1;

/** Linear, bounded motion between coordinates confirmed by the API. */
export class VehicleMotion {
  position: MotionPosition;
  target: MotionPosition;
  private segment?: { from: MotionPosition; to: MotionPosition; startedAt: number; duration: number };
  private lastUpdateAt: number;
  private enabled: boolean;
  private snapNextUpdate: boolean;

  constructor(initial: MotionPosition, now: number, enabled = true) {
    this.position = copy(initial);
    this.target = copy(initial);
    this.lastUpdateAt = now;
    this.enabled = enabled;
    this.snapNextUpdate = !enabled;
  }

  get isAnimating() { return Boolean(this.segment); }

  setEnabled(enabled: boolean, now: number): MotionPosition {
    if (this.enabled === enabled) return this.position;
    if (!enabled) {
      this.sample(now);
      this.enabled = false;
      this.segment = undefined;
      this.position = copy(this.target);
      this.snapNextUpdate = true;
    } else {
      this.enabled = true;
      // The first fresh response is snapped; movement while hidden is not replayed.
    }
    return this.position;
  }

  update(next: MotionPosition, now: number, stale = false): MotionPosition {
    this.sample(now);
    const distance = distanceMeters(this.target, next);
    const interval = now - this.lastUpdateAt;
    this.lastUpdateAt = now;

    if (!this.enabled || stale || this.snapNextUpdate || interval > MAX_ANIMATION_GAP_MS || distanceMeters(this.position, next) > MAX_ANIMATION_DISTANCE_M) {
      this.snapNextUpdate = !this.enabled;
      this.target = copy(next);
      this.segment = undefined;
      this.position = copy(next);
      return this.position;
    }

    // Retain the last accepted anchor so slow real movement accumulates past
    // the conservative GPS noise threshold instead of being suppressed forever.
    if (distance < GPS_JITTER_METERS) return this.position;
    this.target = copy(next);

    this.segment = {
      from: copy(this.position),
      to: copy(next),
      startedAt: now,
      duration: Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, interval || DEFAULT_INTERVAL_MS)),
    };
    return this.position;
  }

  sample(now: number): MotionPosition {
    const segment = this.segment;
    if (!segment) return this.position;
    const progress = Math.max(0, Math.min(1, (now - segment.startedAt) / segment.duration));
    if (progress >= 1) {
      this.position = copy(segment.to);
      this.segment = undefined;
      return this.position;
    }
    this.position = {
      lat: segment.from.lat + (segment.to.lat - segment.from.lat) * progress,
      lon: segment.from.lon + (segment.to.lon - segment.from.lon) * progress,
    };
    return this.position;
  }
}

export function distanceMeters(a: MotionPosition, b: MotionPosition): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const lat1 = a.lat * radians, lat2 = b.lat * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isStalePosition(sourceUpdatedAt: string | undefined, nowEpochMs: number, maxAgeMs = MAX_ANIMATION_GAP_MS): boolean {
  if (!sourceUpdatedAt) return false;
  // Numeric IDs/times and dates without a timezone have unconfirmed semantics.
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(sourceUpdatedAt)) return false;
  const timestamp = Date.parse(sourceUpdatedAt);
  return Number.isFinite(timestamp) && nowEpochMs - timestamp > maxAgeMs;
}

function copy(position: MotionPosition): MotionPosition { return { lat: position.lat, lon: position.lon }; }
