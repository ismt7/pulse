output "bucket_name" {
  description = "Set this value as the AWS_S3_BUCKET GitHub variable."
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "Set this value as the AWS_CLOUDFRONT_DISTRIBUTION_ID GitHub variable."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_url" {
  description = "Default CloudFront URL for the frontend."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "deployment_policy_arn" {
  description = "Attach this policy to the GitHub OIDC deployment role."
  value       = aws_iam_policy.deployment.arn
}
