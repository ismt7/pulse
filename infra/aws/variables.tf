variable "aws_region" {
  description = "Region for the S3 origin. CloudFront remains global."
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Name used for AWS resources."
  type        = string
  default     = "pulse"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for built frontend files."
  type        = string
}

variable "price_class" {
  description = "CloudFront edge location price class."
  type        = string
  default     = "PriceClass_200"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "deployment_role_name" {
  description = "Optional existing GitHub OIDC IAM role to receive deployment permissions."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to supported AWS resources."
  type        = map(string)
  default = {
    Project   = "pulse"
    ManagedBy = "terraform"
  }
}
