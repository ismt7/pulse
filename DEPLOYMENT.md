# デプロイガイド

最初の配信先として、非公開S3バケットとCloudFrontを使用します。S3のWebサイト公開は使わず、Origin Access Control（OAC）を通じてCloudFrontだけがファイルを取得できます。

## 構成

```text
GitHub Actions -- OIDC --> AWS IAM
       |                     |
       +-- build + sync --> private S3 <-- OAC -- CloudFront --> browser
```

- Terraform: `infra/aws`
- デプロイ: `.github/workflows/deploy-aws.yml`
- リージョン初期値: `ap-northeast-1`
- 証明書: CloudFrontの既定ドメインと証明書
- 状態管理: Terraform stateはリポジトリに保存しない

## 1. AWSリソースを作成する

Terraform 1.7以上とAWS認証情報を用意します。

```sh
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`bucket_name` は世界で一意の名前に変更してください。TerraformはS3の公開アクセスをすべて遮断し、暗号化とバージョニングを有効にします。CloudFrontにはHTTPSリダイレクト、圧縮、セキュリティヘッダー、SPA向けの `index.html` フォールバックを設定します。

チーム運用ではTerraform stateをS3などのリモートバックエンドへ移してください。バックエンドは利用するAWSアカウントごとに異なるため、このリポジトリでは固定していません。

## 2. GitHub OIDCロールを用意する

GitHub Actionsの長期アクセスキーは使いません。AWS IAMにGitHub OIDCプロバイダーと、GitHubの `production` Environmentから引き受けられるロールを作成します。

Terraform出力 `deployment_policy_arn` のポリシーをそのロールへ付与してください。既存ロール名を `deployment_role_name` に設定した場合はTerraformが付与します。ロールの信頼ポリシーでは対象を `repo:ismt7/pulse:environment:production` に限定してください。

## 3. GitHub Environmentを設定する

GitHubのリポジトリ設定で `production` Environmentを作り、次のEnvironment variablesを登録します。

| 変数 | 値 |
| --- | --- |
| `AWS_ROLE_ARN` | GitHub OIDCロールのARN |
| `AWS_REGION` | `ap-northeast-1` など |
| `AWS_S3_BUCKET` | Terraform出力 `bucket_name` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Terraform出力 `cloudfront_distribution_id` |

必要に応じてEnvironmentへ承認者を設定すると、公開前にレビューを必須にできます。

## 4. デプロイする

GitHub Actionsの「Deploy frontend to AWS」を手動実行します。ワークフローはビルド後、ハッシュ付きアセットを1年間キャッシュし、`index.html` は再検証対象としてS3へ同期します。最後にCloudFrontのルートと `index.html` を無効化します。

Terraform出力 `cloudfront_url` で動作を確認できます。

## 独自ドメインを追加する場合

ACM証明書を `us-east-1` で発行し、CloudFrontのaliasesとviewer certificateへ設定します。DNSはRoute 53に限定せず、CloudFrontへ向けられるプロバイダーを利用できます。独自ドメイン対応は初期構成には含めていません。
