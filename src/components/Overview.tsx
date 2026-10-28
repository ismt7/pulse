import { average, progress } from "../model";
import type { Metric } from "../types";
import { Icon } from "./Icon";

export function Overview({ metrics }: { metrics: Metric[] }) {
  const achieved = metrics.filter((metric) => progress(metric) >= 100).length;
  return (
    <section className="overview" aria-label="サマリー">
      <div>
        <span className="summary-label">
          <Icon name="flag" /> 取り組んでいる目標
        </span>
        <div className="summary-number">
          {metrics.length}
          <small>個</small>
          <span className="summary-foot">自分だけのチャレンジ</span>
        </div>
      </div>
      <div>
        <span className="summary-label">
          <Icon name="grid" /> 平均達成率
        </span>
        <div className="summary-number">
          {average(metrics)}
          <small>%</small>
          <span className="summary-foot">一歩ずつ、着実に</span>
        </div>
      </div>
      <div>
        <span className="summary-label">
          <Icon name="check" /> 達成した目標
        </span>
        <div className="summary-number">
          {achieved}
          <small>/ {metrics.length}</small>
          <span className="summary-foot green">
            {achieved ? "いい調子、その調子！" : "次の達成が、楽しみ。"}
          </span>
        </div>
      </div>
    </section>
  );
}
