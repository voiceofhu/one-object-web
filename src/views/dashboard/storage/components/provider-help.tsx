import { useLocalAtom } from "@/hooks/use-local-atom"
import {} from "react"
import { useObjectTranslation } from "@/local/object"
import { CircleHelpIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PROVIDERS, type Provider } from "@/views/dashboard/storage/api"

const guides: Record<Provider, { steps: string; fields: [string, string][] }> =
  {
    oci: {
      // https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm
      steps:
        "进入 OCI 用户设置 → Customer secret keys，生成客户密钥，并为该用户授予所需 Object Storage 权限。",
      fields: [
        [
          "Object Storage Namespace",
          "在租户详情查看 Object Storage Namespace，填写命名空间名称，不填写租户 OCID。",
        ],
        ["区域", "填写目标桶的区域标识，如 ap-singapore-1。"],
        [
          "Access Key ID",
          "复制 Customer secret keys 列表中对应的 Access Key。",
        ],
        [
          "Secret Access Key",
          "填写生成客户密钥时显示的 Secret Key；不是 API Signing Key 私钥，生成后无法再次查看。",
        ],
        [
          "存储桶范围",
          "S3 兼容 API 使用租户配置的默认 compartment，默认为根 compartment；请确保用户具备该范围权限。",
        ],
      ],
    },
    r2: {
      // https://developers.cloudflare.com/r2/api/tokens/
      steps:
        "进入 Cloudflare 控制台 → R2 → 管理 R2 API 令牌，创建专用凭证。需要创建、删除桶时选择 Admin Read & Write 权限。",
      fields: [
        [
          "Cloudflare Account ID",
          "在 R2 概览中复制 Account ID，也可从 S3 API 地址中取得 .r2.cloudflarestorage.com 前的账号 ID。",
        ],
        [
          "Access Key ID",
          "复制 R2 令牌创建结果中用于 S3 客户端的 Access Key ID。",
        ],
        [
          "Secret Access Key",
          "复制同一次创建结果中的 Secret Access Key 并妥善保存；此处不填写 API Token。",
        ],
      ],
    },
    aws: {
      // https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
      steps:
        "进入 AWS IAM → 用户，选择专用 IAM 用户并授予所需 S3 权限，然后在安全凭证中创建访问密钥。",
      fields: [
        [
          "区域",
          "填写目标桶所在的 AWS 区域代码，如 us-east-1；可在 S3 控制台的桶列表查看区域。",
        ],
        ["Access Key ID", "复制 IAM 用户创建访问密钥后显示的访问密钥 ID。"],
        [
          "Secret Access Key",
          "复制同一组秘密访问密钥，仅创建时可查看；遗失后需创建新密钥。",
        ],
      ],
    },
    aliyun: {
      // https://www.alibabacloud.com/help/en/oss/developer-reference/use-the-accesskey-pair-of-a-ram-user-to-initiate-a-request
      steps:
        "进入阿里云 RAM → 用户，创建或选择专用 RAM 用户，授予所需 OSS 权限并创建 AccessKey。",
      fields: [
        [
          "区域",
          "从 OSS 控制台目标桶的概览查看地域，填写地域代码，如 cn-hangzhou，不填写完整 Endpoint。",
        ],
        ["Access Key ID", "填写 RAM 用户创建的 AccessKey ID。"],
        [
          "Secret Access Key",
          "填写与该 ID 配对的 AccessKey Secret，创建时保存。",
        ],
      ],
    },
    tencent: {
      // https://www.tencentcloud.website/document/product/436/40766
      steps:
        "进入腾讯云访问管理 CAM，为专用子用户配置所需 COS 权限，并在 API 密钥管理中创建密钥。",
      fields: [
        [
          "区域",
          "在 COS 控制台目标桶的配置信息中查看所属地域，填写代码，如 ap-guangzhou。",
        ],
        ["SecretId", "复制 CAM API 密钥管理中的 SecretId。"],
        ["SecretKey", "复制与该 SecretId 配对的 SecretKey。"],
      ],
    },
  }

export function ProviderHelp({ provider }: { provider: Provider }) {
  const tx = useObjectTranslation()

  const [open, setOpen] = useLocalAtom(false)
  const guide = guides[provider]
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              setOpen((value) => !value)
            }}
            aria-label={tx("{0} 接入帮助", { 0: tx(PROVIDERS[provider]) })}
            className="inline-flex size-11 md:size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelpIcon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          showArrow={false}
          side="bottom"
          align="start"
          sideOffset={8}
          className="block max-h-[65svh] overflow-y-auto w-96 max-w-[calc(100vw-2rem)] space-y-3 p-4 text-xs leading-relaxed"
        >
          <p className="font-semibold">
            {tx(PROVIDERS[provider])}
            {tx("接入步骤")}
          </p>
          <p>{tx(guide.steps)}</p>
          <dl className="space-y-2">
            {[
              [
                tx("名称"),
                tx("自定义接入名称，便于区分账号，无需从云平台获取。"),
              ],
              ...guide.fields,
            ].map(([label, description]) => (
              <div key={label}>
                <dt className="font-semibold">{tx(label)}</dt>
                <dd className="opacity-80">{tx(description)}</dd>
              </div>
            ))}
          </dl>
          <p className="opacity-80">
            {tx(
              "保存后在「桶管理」中同步或创建存储桶。同步需列桶权限，创建和删除需对应桶管理权限；文件操作需相应对象权限。",
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
