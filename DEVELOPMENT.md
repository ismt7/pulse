# 開発者向けガイド

## 技術構成

PulseはReact、TypeScript、Viteで構築しています。スタイルはCSS、グラフはRecharts、テストはVitestとPlaywrightを使用しています。

UIを変更する場合は [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) のトークン、コンポーネントの役割、アクセシビリティ基準に従ってください。

Node.js 24とnpmを推奨します。対応するNode.jsの範囲は `package.json` の `engines` に記載しています。

## 開発環境

### Docker Composeを使う

ローカルに必要なのはDocker DesktopまたはDocker EngineとComposeです。Node.jsをホストへ直接インストールせずに開発できます。

```sh
docker compose up --build
```

ブラウザで `http://localhost:5173` を開きます。ソースコードはホストからマウントされ、変更するとViteが画面を更新します。依存パッケージは名前付きボリューム `node_modules` に保存され、ホスト側の `node_modules` とは分離されます。

コンテナ内で検証コマンドを実行する場合は、別のターミナルから次を実行します。

```sh
docker compose exec app npm test
docker compose exec app npm run typecheck
docker compose exec app npm run build
```

依存関係を更新した場合はイメージとボリューム内の依存パッケージを更新します。

```sh
docker compose build --no-cache app
docker compose run --rm app npm ci
```

停止は `docker compose down`、依存パッケージ用ボリュームも削除する場合は `docker compose down --volumes` を使用します。ブラウザに保存されたPulseのデータはDockerボリュームではなくブラウザ側に残ります。

VS Code Dev Containersを利用する場合は、このリポジトリを開いて「Reopen in Container」を実行してください。`.devcontainer/devcontainer.json` が同じComposeサービスを使用します。

### Node.jsを直接使う

```sh
npm ci
npm run dev
```

Viteはクラウド開発環境でもアクセスできるよう、全インターフェースで待ち受けます。自分の端末だけで使う場合は次のように起動できます。

```sh
npm run dev -- --host 127.0.0.1
```

AWSへ配置する場合は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。S3とCloudFrontのTerraform構成、およびGitHub Actionsの手動デプロイを用意しています。

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
