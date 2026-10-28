data "aws_iam_policy_document" "deployment" {
  statement {
    sid       = "ListFrontendBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.frontend.arn]
  }

  statement {
    sid = "ManageFrontendObjects"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }

  statement {
    sid       = "InvalidateFrontendCache"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.frontend.arn]
  }
}

resource "aws_iam_policy" "deployment" {
  name        = "${var.project_name}-frontend-deployment"
  description = "Least-privilege deployment access for the ${var.project_name} frontend"
  policy      = data.aws_iam_policy_document.deployment.json
}

resource "aws_iam_role_policy_attachment" "deployment" {
  count = var.deployment_role_name == "" ? 0 : 1

  role       = var.deployment_role_name
  policy_arn = aws_iam_policy.deployment.arn
}
