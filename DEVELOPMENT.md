# 開発者向けガイド

## 技術構成

PulseはReact、TypeScript、Viteで構築しています。スタイルはCSS、グラフはRecharts、テストはVitestとPlaywrightを使用しています。

Node.js 24とnpmを推奨します。対応するNode.jsの範囲は `package.json` の `engines` に記載しています。

## 開発環境

```sh
npm ci
npm run dev
```

Viteはクラウド開発環境でもアクセスできるよう、全インターフェースで待ち受けます。自分の端末だけで使う場合は次のように起動できます。

```sh
npm run dev -- --host 127.0.0.1
```

サイトへのデプロイ設定は含みません。

## 検証

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

既存のChromiumを使う場合は `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` を指定できます。開発中に単体テストを監視実行する場合は `npm run test:watch` を使います。

GitHub Actionsでは単体テスト、型チェック付きビルド、E2Eテスト、依存パッケージ監査を実行します。別のセキュリティワークフローでDependency ReviewとCodeQLを実行し、DependabotがnpmパッケージとGitHub Actionsの更新を毎週確認します。

## コード構成

```text
src/
  App.tsx                画面の構成と操作の接続
  components/            目標カード、フォーム、グラフ、ダイアログ
  hooks/useDashboard.ts  保存データとReactの状態を接続
  types.ts               目標、実績、保存形式の型
  model.ts               達成率の計算、入力検証、記録の更新
  storage.ts             保存データの読み書き
test/                    Vitestの計算・保存互換性テスト
e2e/                     Playwrightのブラウザ操作テスト
```

## データ保存と互換性

データはブラウザの `localStorage` に保存します。保存キーは `pulse.dashboard.v1` です。保存形式を変更する場合は、既存データを引き継げるよう移行処理を用意してください。

保存に失敗した場合、画面上の実績は更新せず、再試行できるよう入力内容をフォームに残します。インポートはバージョン1の保存形式に対応し、不正な値、日付、重複ID、同一目標の同日記録を拒否します。
