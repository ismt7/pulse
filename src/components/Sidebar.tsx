import { Icon } from "./Icon";

export function Sidebar({ onAdd }: { onAdd: () => void }) {
  return (
    <aside className="sidebar">
      <a href="#" className="brand" aria-label="Pulse ホーム">
        <span className="brand-mark">
          p<span>·</span>
        </span>
        pulse<span className="brand-dot">.</span>
      </a>
      <div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav>
        <a href="#" className="nav-active">
          <Icon name="grid" /> ダッシュボード
          <span className="nav-dot" />
        </a>
        <button onClick={onAdd}>
          <Icon name="plus" /> 新しい目標
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="local-note">
          <Icon name="leaf" />
          <strong>あなたのペースで。</strong>
          <p>
            小さな一歩も、立派な前進。
            <br />
            昨日の自分から、少しずつ。
          </p>
        </div>
        <div className="profile">
          <span className="avatar">P</span>
          <div>
            <strong>マイワークスペース</strong>
            <small>ローカル保存 · アカウント不要</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
