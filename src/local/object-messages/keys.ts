export const keys = {
  "请配置唯一且启用的 tigerzh R2 one-object 存储桶":
    "Configure one enabled tigerzh R2 one-object bucket",
  应用图标: "Application icon",
  上传应用图标: "Upload application icon",
  选择应用图标: "Choose application icon",
  上传图标: "Upload icon",
  更换图标: "Change icon",
  裁剪应用图标: "Crop application icon",
  "PNG / JPEG / WebP，最大 5 MB": "PNG / JPEG / WebP, up to 5 MB",
  "拖动图片，调整缩放。": "Drag the image and adjust the zoom.",
  预览: "Preview",
  裁剪预览: "Crop preview",
  缩放: "Zoom",
  图片缩放: "Image zoom",
  图片尚未就绪: "The image is not ready yet",
  "无法处理图片，请重试": "Could not process the image. Try again.",
  "裁剪失败，请重试": "Could not crop the image. Try again.",
  "请选择不超过 5 MB 的 PNG、JPEG 或 WebP 图片":
    "Choose a PNG, JPEG or WebP image up to 5 MB",
  "无法读取图片，请换一张图片":
    "Could not read the image. Choose another image.",
  "图标须为不超过 128 KB 的 PNG 图片":
    "The icon must be a PNG image up to 128 KB",
  图标图片无效: "Invalid icon image",
  图标图片过大: "The icon image is too large",
  "图标须为有效的 PNG 图片，尺寸不超过 256×256":
    "The icon must be a valid PNG image up to 256×256",

  密钥: "Key",
  授权已删除: "Authorization deleted",
  删除授权: "Delete authorization",
  启用授权: "Enable authorization",
  已停用: "Disabled",
  已启用: "Enabled",
  "删除后 Token 永久失效，授权不可恢复。已上传文件保留，不会删除。":
    "Deleting permanently invalidates this Token and cannot be undone. Uploaded files are retained.",
  "路径默认 one-object/；权重默认 1，全部留空时均分。":
    "The path defaults to one-object/ and weight to 1. Empty weights distribute uploads equally.",
  "权重（可选）": "Weight (optional)",
  "权重需为 1 到 1000 的整数": "Weight must be an integer from 1 to 1000",
  授权说明: "Authorization guide",
  使用文档: "Usage guide",
  授权使用文档: "Authorization usage guide",
  "轮换 Token": "Rotate Token",
  确认轮换: "Confirm rotation",
  "Token 已轮换，请复制新 Token": "Token rotated. Copy the new Token.",
  "旧 Token 将立即失效，请将新 Token 更新到应用服务端。文件归属、权限和有效期保持不变。":
    "The old Token stops working immediately. Update your server with the new Token. File ownership, permissions and expiry stay unchanged.",
  "选择权限和存储桶，Token 默认不过期。":
    "Choose permissions and buckets. Tokens do not expire by default.",
  权限范围: "Permissions",
  "文件夹可不填，默认使用 one-object/。多个桶上传时需指定 storage_id。":
    "The folder is optional and defaults to one-object/. Specify storage_id when using multiple buckets.",
  请选择存储桶: "Choose a bucket",
  添加存储桶: "Add bucket",
  当前账号没有存储桶查看权限: "You do not have permission to view buckets",
  "仅修改应用名称，Token 和原有授权保持不变。":
    "Only the application name changes. The Token and existing authorization stay unchanged.",
  "填写名称即可生成 Token，复制到应用服务端使用。":
    "Enter a name to generate a Token, then copy it to your application server.",
  "Token 默认不过期，使用当前账号已有的文件操作权限，不额外限制桶范围。":
    "Tokens do not expire by default, use your current file permissions, and have no additional bucket restrictions.",
  "生成 Token": "Generate Token",
  "3. 维护授权": "3. Maintain authorizations",
  "可随时修改应用名称；不再使用时撤销 Token，应用会立即失去访问权限。":
    "Rename applications at any time. Revoke unused Tokens to immediately remove application access.",
  "为服务端应用创建最小权限的访问 Token。":
    "Create least-privilege access Tokens for server-side applications.",
  "1. 创建授权": "1. Create an authorization",
  "填写应用名称，按实际用途选择有效期、权限和可访问的桶或文件夹。":
    "Name the application, then choose its validity, permissions, and accessible buckets or folders.",
  "2. 配置到服务端": "2. Configure the server",
  "复制 Token 并保存到接入应用的服务端环境变量，不要放入浏览器、移动端或公开代码。":
    "Copy the Token into the application's server environment variables. Do not put it in browsers, mobile apps, or public code.",
  "3. 按需授权": "3. Grant only what is needed",
  "上传需要上传文件，下载和查看需要读取文件，删除操作才授予删除文件。留空桶范围表示可访问全部桶。":
    "Uploads need upload permission, downloads and viewing need read permission, and deletion needs delete permission. An empty bucket scope allows all buckets.",
  "4. 维护授权": "4. Maintain authorizations",
  "可随时编辑名称、有效期和范围；不再使用时撤销，应用会立即失去访问权限。":
    "You can edit names, validity, and scopes at any time. Revoke unused authorizations to immediately remove application access.",
}
