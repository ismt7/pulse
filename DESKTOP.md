# デスクトップアプリ

PulseはTauri 2を使い、Web版と同じReactフロントエンドからWindows、macOS、Linux向けアプリを生成します。データは各OSのWebViewが管理するローカルストレージに保存され、サーバーへ送信されません。

## 利用者向けダウンロード

公開済みバージョンはGitHubリポジトリのReleasesページからダウンロードできます。

```text
https://github.com/ismt7/pulse/releases
```

OSに合うファイルを選択してください。

- Windows: `.msi` またはセットアップ用 `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` または `.deb`

初期リリースはコード署名を設定していないため、Windows SmartScreenやmacOS Gatekeeperが警告を表示する場合があります。一般配布を始める前に各OSの署名証明書を設定してください。

## ローカルで開発する

Node.js 24、npm、Rust、Tauriが要求するOS別システム依存関係を用意します。詳細はTauri 2のPrerequisitesを参照してください。

```sh
npm ci
npm run desktop:dev
```

配布物をローカルで生成する場合は次を実行します。

```sh
npm run desktop:build
```

生成物は `src-tauri/target/release/bundle` 以下に出力されます。

## GitHub Releasesへ公開する

1. `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` のバージョンを同じ値へ更新する
2. CIが成功していることを確認する
3. 同じバージョンのタグを作成してpushする（例: `v0.2.0`）
4. 「Release desktop apps」ワークフローの完了を確認する
5. GitHub Releasesから各OSのインストーラーをダウンロードして確認する

```sh
git tag v0.2.0
git push origin v0.2.0
```

タグのpushを契機に4種類のビルドを実行し、GitHub Releaseへ添付します。

## 保存データについて

Web版とデスクトップ版は同じデータ形式を使いますが、保存場所は別です。Web版からJSONを書き出し、デスクトップ版で読み込むことで移行できます。アプリのアンインストールやOSのWebViewデータ削除に備え、JSONバックアップを定期的に作成してください。

## リリース前の残タスク

- [ ] GitHub Actionsで4種類のデスクトップビルドを初回検証する
- [ ] Windows、macOS Intel、macOS Apple Silicon、Linuxで起動確認する
- [ ] JSONの書き出し・読み込みと再起動後のデータ保持を確認する
- [ ] Windowsコード署名証明書を設定する
- [ ] Apple Developer ID署名と公証を設定する
- [ ] インストーラーのウイルススキャン結果を確認する
