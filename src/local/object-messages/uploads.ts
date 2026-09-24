export const uploads = {
  "小于 100 MB 使用普通上传接口；达到 100 MB 后创建分片任务，按 part_size 上传并调用 complete。":
    "Use single upload below 100 MB. At 100 MB or above, create a multipart upload, send chunks using part_size, and call complete.",
  "取消未完成任务；普通上传重试会重传整文件，分片上传只需补传未确认分片。":
    "Cancel unfinished uploads. Single upload retries resend the whole file; multipart retries resend only unconfirmed parts.",

  选择原文件重试: "Choose the original file to retry",
  "普通上传需小于 100 MB 且提供文件摘要":
    "Single uploads must be smaller than 100 MB and include checksums",
  "普通上传需为 1 字节至小于 100 MB":
    "Single uploads must be between 1 byte and under 100 MB",
  "已停止，重试将重新上传": "Stopped; retry uploads the whole file",
  "重新上传 {0}": "Upload {0} again",
  正在上传: "Uploading",

  没有上传的任务: "No upload tasks",
  当前筛选下没有上传任务: "No upload tasks match this filter",
  上传文件夹路径无效: "Invalid upload folder path",
  目标位置已有同名文件或上传任务:
    "A file or upload with this name already exists at the destination",
  目标对象键已被占用: "The storage object key is already in use",
  "个云端桶吗？仅支持空桶；存在文件、历史版本或未完成分片时会拒绝删除。":
    " cloud buckets? Only empty buckets can be deleted. Files, versions or incomplete multipart uploads prevent deletion.",
  "选择存储桶区域，创建私有桶并接入文件上传。":
    "Choose a region to create a private bucket for uploads.",
  "」。仅支持空桶；存在文件、历史版本或未完成分片时会拒绝删除。":
    "”? Only empty buckets can be deleted. Files, versions or incomplete multipart uploads prevent deletion.",
  "删除后禁止访问，已上传文件和操作记录保留。":
    "Access will be blocked. Uploaded files and activity records will be retained.",
  上传文件: "Upload files",
  最近上传: "Recent uploads",
  "当前账户最近上传的 6 个文件。":
    "The 6 most recent uploads accessible to the current account.",
  "获得文件查看权限后可查看最近上传。":
    "File access permission is required to view recent uploads.",
  "上传文件后，会在这里显示。": "Uploaded files will appear here.",
  上传时间: "Uploaded",
  "创建上传任务，按返回的 part_size 切片，从 1 开始上传，最后调用 complete。":
    "Create an upload, split the file using the returned part_size, upload parts starting at 1, then call complete.",
  "返回已确认的分片及 SHA-256。核对原文件后，只补传缺失分片。":
    " returns confirmed parts and SHA-256 hashes. Verify the original file and upload only missing parts.",
  "取消任务。分片重复提交相同内容、合并重试均可安全恢复。":
    " cancels an upload. Retrying identical parts or completion is safe.",
  "浏览器前端通过自己的应用后端转发上传请求。长期应用密钥不能放入浏览器代码。":
    "Browser clients should upload through their own application backend. Never embed long-lived application keys in browser code.",
  "创建密钥后，其他应用即可接入统一上传。":
    "Create a key to let other applications use unified uploads.",
  "统一上传、存储与管理文件，通过 One User 安全登录。":
    "Upload, store and manage files in one place. Sign in securely with One User.",
  "停用后，该厂商不能用于新上传及云端桶管理；已有文件和未完成上传仍保留。":
    "Disabling prevents new uploads and cloud bucket management. Existing files and incomplete uploads will be retained.",
  "删除所选厂商及其本地桶接入配置，云端桶和对象不受影响。有关联文件或未完成上传时，整批操作将被拒绝。":
    "Delete the selected providers and their local bucket connections. Cloud buckets and objects are unaffected. The entire operation is rejected if files or incomplete uploads are linked.",
  选择原文件续传: "Select the original file to resume",
  准备上传: "Preparing upload",
  秒传完成: "Instant upload complete",
  上传完成: "Upload complete",
  上传失败: "Upload failed",
  等待上传: "Queued",
  上传队列: "Upload queue",
  "支持多文件、暂停续传和同桶文件内容校验秒传。关闭窗口后继续上传；刷新后需重新选择原文件。":
    "Upload multiple files, pause and resume, or reuse matching content in the same bucket. Uploads continue when this dialog closes. After refreshing, select the original files again.",
  上传存储桶: "Upload bucket",
  添加文件到上传队列: "Add files to the upload queue",
  "正在读取上传任务…": "Loading uploads…",
  上传进度: "Upload progress",
  上传: "Uploads",
  上传连接失败: "Upload connection failed",
  上传请求超时: "Upload request timed out",
  读取上传任务: "Loading upload",
  检查秒传并准备上传: "Checking for matching content and preparing upload",
  "请选择与上传任务名称、大小一致的原文件":
    "Select the original file with the same name and size as the upload",
  "上传任务已结束，请重新上传": "This upload has ended. Start a new upload.",
  校验已上传分片: "Verifying uploaded parts",
  上传分片信息无效: "Invalid upload part information",
  "已上传分片与所选文件不一致，请取消任务并重新上传":
    "Uploaded parts do not match this file. Cancel and start a new upload.",
  正在合并: "Completing upload",
  文件超过上传大小上限: "The file exceeds the upload size limit",
  文件需要的分片数超过上限: "The file requires more parts than allowed",
  "传输分片 {0}/{1}": "Uploading part {0}/{1}",
  "停用后，此桶不能用于新上传；已有文件和未完成上传仍保留。":
    "Disabling prevents new uploads to this bucket. Existing files and incomplete uploads are retained.",
}
