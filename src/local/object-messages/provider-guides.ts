export const providerGuides = {
  "进入 OCI 用户设置 → Customer secret keys，生成客户密钥，并为该用户授予所需 Object Storage 权限。":
    "In OCI user settings, open Customer secret keys and generate a key. Grant the user the required Object Storage permissions.",
  "在租户详情查看 Object Storage Namespace，填写命名空间名称，不填写租户 OCID。":
    "Find Object Storage Namespace in tenancy details. Enter the namespace name, not the tenancy OCID.",
  "填写目标桶的区域标识，如 ap-singapore-1。":
    "Enter the target bucket's region identifier, such as ap-singapore-1.",
  "复制 Customer secret keys 列表中对应的 Access Key。":
    "Copy the Access Key from the Customer secret keys list.",
  "填写生成客户密钥时显示的 Secret Key；不是 API Signing Key 私钥，生成后无法再次查看。":
    "Enter the Secret Key shown when the customer key was generated. This is not an API signing private key, and it cannot be viewed again.",
  存储桶范围: "Bucket scope",
  "S3 兼容 API 使用租户配置的默认 compartment，默认为根 compartment；请确保用户具备该范围权限。":
    "The S3-compatible API uses the tenancy's default compartment (the root compartment by default). Ensure the user has access to that scope.",
  "进入 Cloudflare 控制台 → R2 → 管理 R2 API 令牌，创建专用凭证。需要创建、删除桶时选择 Admin Read & Write 权限。":
    "In Cloudflare, open R2 → Manage R2 API Tokens and create dedicated credentials. Choose Admin Read & Write if bucket creation or deletion is required.",
  "在 R2 概览中复制 Account ID，也可从 S3 API 地址中取得 .r2.cloudflarestorage.com 前的账号 ID。":
    "Copy the Account ID from the R2 overview, or from the S3 API URL before .r2.cloudflarestorage.com.",
  "复制 R2 令牌创建结果中用于 S3 客户端的 Access Key ID。":
    "Copy the S3 Access Key ID shown when the R2 token is created.",
  "复制同一次创建结果中的 Secret Access Key 并妥善保存；此处不填写 API Token。":
    "Copy and save the Secret Access Key from the same credentials. Do not enter the API Token here.",
  "进入 AWS IAM → 用户，选择专用 IAM 用户并授予所需 S3 权限，然后在安全凭证中创建访问密钥。":
    "In AWS IAM → Users, select a dedicated user and grant the required S3 permissions. Create an access key under Security credentials.",
  "填写目标桶所在的 AWS 区域代码，如 us-east-1；可在 S3 控制台的桶列表查看区域。":
    "Enter the bucket's AWS region code, such as us-east-1. Find it in the S3 console bucket list.",
  "复制 IAM 用户创建访问密钥后显示的访问密钥 ID。":
    "Copy the access key ID generated for the IAM user.",
  "复制同一组秘密访问密钥，仅创建时可查看；遗失后需创建新密钥。":
    "Copy the matching secret access key. It is shown only at creation; create a new key if it is lost.",
  "进入阿里云 RAM → 用户，创建或选择专用 RAM 用户，授予所需 OSS 权限并创建 AccessKey。":
    "In Alibaba Cloud RAM → Users, create or select a dedicated user, grant the required OSS permissions and create an AccessKey.",
  "从 OSS 控制台目标桶的概览查看地域，填写地域代码，如 cn-hangzhou，不填写完整 Endpoint。":
    "Find the bucket's region in the OSS console overview. Enter its code, such as cn-hangzhou, rather than the full endpoint.",
  "填写 RAM 用户创建的 AccessKey ID。": "Enter the RAM user's AccessKey ID.",
  "填写与该 ID 配对的 AccessKey Secret，创建时保存。":
    "Enter the matching AccessKey Secret saved at creation.",
  "进入腾讯云访问管理 CAM，为专用子用户配置所需 COS 权限，并在 API 密钥管理中创建密钥。":
    "In Tencent Cloud CAM, grant a dedicated sub-user the required COS permissions and create credentials in API Key Management.",
  "在 COS 控制台目标桶的配置信息中查看所属地域，填写代码，如 ap-guangzhou。":
    "Find the bucket's region in the COS console configuration. Enter its code, such as ap-guangzhou.",
  "复制 CAM API 密钥管理中的 SecretId。":
    "Copy the SecretId from CAM API Key Management.",
  "复制与该 SecretId 配对的 SecretKey。":
    "Copy the SecretKey matching that SecretId.",
}
