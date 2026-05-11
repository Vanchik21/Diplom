export interface Metrics {
  scalars: Record<string, number>;
  timeSeries: Record<string, number[]>;
}
