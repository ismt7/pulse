export type MetricColor = 0 | 1 | 2 | 3;

export interface Entry {
  date: string;
  value: number;
}
export interface MetricFields {
  name: string;
  target: number;
  unit: string;
  recordingMode?: RecordingMode;
  direction?: MetricDirection;
  baseline?: number;
  periodType?: GoalPeriodType;
  periodStart?: string;
  periodEnd?: string;
}
export type RecordingMode = "cumulative" | "increment";
export type MetricDirection = "increase" | "decrease";
export type GoalPeriodType = "all" | "monthly" | "quarterly" | "custom";
export interface Metric extends MetricFields {
  id: string;
  color: MetricColor;
  entries: Entry[];
}
export interface DashboardState {
  version: 1;
  demo: boolean;
  metrics: Metric[];
}
export type GoalFilter = "all" | "active" | "done";
export type ChartRange = 7 | 30;
