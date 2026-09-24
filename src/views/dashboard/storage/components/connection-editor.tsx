import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { useObjectTranslation } from "@/local/object"

import { useMutation, useQuery } from "@tanstack/react-query"

import { zodResolver } from "@hookform/resolvers/zod"

import { connectionSchema } from "../schema"

import { ProviderHelp } from "../provider-help"

import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs"

import { useForm, useWatch } from "react-hook-form"

import { useEffect, useState } from "react"

import { CircleHelpIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { toast } from "@/lib/toast"

import { Input } from "@/components/ui/input"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

import { Field, FieldLabel, FieldError } from "@/components/ui/field"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"

import { SweepShine } from "@/components/sweep-shine"

import {
  PROVIDERS,
  createAccount,
  getAccountCredentials,
  updateAccount,
  type ConnectionInput,
  type StorageAccount,
} from "../api"

function endpointIdentity(account: StorageAccount) {
  try {
    const host = new URL(account.endpoint).hostname
    if (account.provider === "r2") return host.split(".")[0]
    if (account.provider === "oci") {
      return host.split(".compat.objectstorage.")[0]
    }
  } catch {
    return ""
  }
  return ""
}

export function ConnectionEditor({
  value,
  close,
  saved,
}: {
  value: StorageAccount | "new"
  close: () => void
  saved: () => void
}) {
  const tx = useObjectTranslation()

  const existing = value === "new" ? null : value
  const form = useForm<ConnectionInput>({
    resolver: zodResolver(connectionSchema(Boolean(existing), true)),
    defaultValues: {
      name: existing?.name ?? "",
      provider: existing?.provider ?? "r2",
      bucket: "",
      region: existing?.region ?? "",
      account_id: "",
      access_key: "",
      secret_key: "",
    },
  })
  const credentials = useQuery({
    queryKey: ["storage-account-credentials", existing?.id],
    queryFn: () => getAccountCredentials(existing?.id ?? ""),
    enabled: Boolean(existing),
    retry: false,
    gcTime: 0,
  })
  const { setValue } = form
  useEffect(() => {
    if (!credentials.data) return
    setValue("access_key", credentials.data.access_key)
    setValue("secret_key", credentials.data.secret_key)
  }, [credentials.data, setValue])
  const credentialsUnavailable = Boolean(existing) && credentials.isError
  const credentialsReady =
    !existing || credentials.isSuccess || credentialsUnavailable
  const [showSecret, setShowSecret] = useState(false)
  const existingIdentity = existing ? endpointIdentity(existing) : ""
  const provider = useWatch({ control: form.control, name: "provider" })
  const save = useMutation({
    mutationFn: async (input: ConnectionInput) => {
      await (existing
        ? updateAccount(existing.id, {
            name: input.name,
            enabled: existing.enabled,
            ...(input.access_key || input.secret_key
              ? { access_key: input.access_key, secret_key: input.secret_key }
              : {}),
          })
        : createAccount(input))
    },
    onSuccess: () => {
      toast.success(tx("存储接入已保存"))
      saved()
      close()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) close()
      }}
    >
      <ResponsiveDialogContent className="flex max-h-[90svh] flex-col sm:max-w-xl">
        <ResponsiveDialogHeader className="max-md:px-3 max-md:py-1.5 max-md:pr-10">
          <ResponsiveDialogTitle>
            {existing ? tx("编辑接入") : tx("新增厂商接入")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only md:not-sr-only">
            {tx(
              "配置厂商账号，密钥直接保存。保存后可在桶管理中同步或创建存储桶。",
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="flex min-h-0 flex-col"
          noValidate
          onSubmit={form.handleSubmit((input) => {
            if (
              credentialsUnavailable &&
              (!input.access_key.trim() || !input.secret_key.trim())
            ) {
              toast.error(tx("原存储凭证无法读取，请重新填写两个密钥后保存。"))
              return
            }
            save.mutate(input)
          })}
        >
          <ResponsiveDialogBody className="grid gap-x-4 gap-y-3 overflow-y-auto max-md:gap-y-2 max-md:p-3 sm:grid-cols-2 [&_[data-slot=field]]:gap-1.5 [&_[data-slot=input]]:h-8">
            {!existing && (
              <Field className="sm:col-span-2">
                <div className="flex items-center gap-1.5">
                  <FieldLabel>
                    {tx("存储厂商")}{" "}
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  </FieldLabel>
                  <ProviderHelp provider={provider} />
                </div>
                <AnimatedSegmentedTabs
                  label={tx("存储厂商")}
                  value={provider}
                  options={Object.entries(PROVIDERS).map(([value, label]) => ({
                    value: value as ConnectionInput["provider"],
                    label: (
                      <>
                        <img
                          src={`/storage-providers/${value}.svg`}
                          alt=""
                          aria-hidden="true"
                          className="size-4 shrink-0 object-contain"
                        />
                        {label}
                      </>
                    ),
                    disabled: save.isPending,
                  }))}
                  onValueChange={(value) => {
                    form.setValue("provider", value, { shouldDirty: true })
                    form.clearErrors()
                  }}
                  className="min-w-0"
                  listClassName="grid h-auto w-fit max-w-full grid-cols-2 sm:flex sm:flex-wrap"
                  triggerClassName="h-7 flex-none gap-1.5 px-2 text-xs"
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="connection-name">
                {tx("名称")}{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Input
                id="connection-name"
                aria-invalid={!!form.formState.errors.name}
                aria-describedby="connection-name-error"
                required
                maxLength={100}
                {...form.register("name")}
              />
              <FieldError
                id="connection-name-error"
                errors={[form.formState.errors.name]}
              />
            </Field>
            {!existing && (
              <>
                {(provider === "r2" || provider === "oci") && (
                  <Field>
                    <FieldLabel htmlFor="connection-account">
                      {provider === "oci"
                        ? "Object Storage Namespace"
                        : "Cloudflare Account ID"}{" "}
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </FieldLabel>
                    <Input
                      id="connection-account"
                      aria-invalid={!!form.formState.errors.account_id}
                      aria-describedby="connection-account-error"
                      required
                      maxLength={provider === "oci" ? 100 : 32}
                      {...form.register("account_id")}
                    />
                    <FieldError
                      id="connection-account-error"
                      errors={[form.formState.errors.account_id]}
                    />
                  </Field>
                )}
                {provider !== "r2" && (
                  <Field>
                    <FieldLabel htmlFor="connection-region">
                      {provider === "oci" ? tx("区域") : tx("默认区域（可选）")}
                      {provider === "oci" && (
                        <span className="text-destructive" aria-hidden="true">
                          {" "}
                          *
                        </span>
                      )}
                    </FieldLabel>
                    <Input
                      id="connection-region"
                      aria-invalid={!!form.formState.errors.region}
                      aria-describedby="connection-region-error"
                      required={provider === "oci"}
                      {...form.register("region")}
                      placeholder={
                        provider === "aws"
                          ? "us-east-1"
                          : provider === "aliyun"
                            ? "cn-hangzhou"
                            : provider === "oci"
                              ? "ap-singapore-1"
                              : "ap-guangzhou"
                      }
                    />
                    <FieldError
                      id="connection-region-error"
                      errors={[form.formState.errors.region]}
                    />
                  </Field>
                )}
              </>
            )}
            {existing && (
              <div className="grid gap-x-4 gap-y-3 sm:col-span-2 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="connection-provider">
                    {tx("存储厂商")}
                  </FieldLabel>
                  <Input
                    id="connection-provider"
                    value={tx(PROVIDERS[existing.provider])}
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/50"
                  />
                </Field>
                {existingIdentity && (
                  <Field>
                    <FieldLabel htmlFor="connection-identity">
                      {existing.provider === "r2"
                        ? "Cloudflare Account ID"
                        : "Object Storage Namespace"}
                    </FieldLabel>
                    <Input
                      id="connection-identity"
                      value={existingIdentity}
                      readOnly
                      tabIndex={-1}
                      className="bg-muted/50"
                    />
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor="connection-region">
                    {tx("区域")}
                  </FieldLabel>
                  <Input
                    id="connection-region"
                    value={existing.region}
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/50"
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="connection-endpoint">
                    Endpoint
                  </FieldLabel>
                  <Input
                    id="connection-endpoint"
                    value={existing.endpoint}
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/50"
                  />
                </Field>
              </div>
            )}
            {existing && !credentialsReady && (
              <p
                className={
                  credentials.isError
                    ? "text-sm text-destructive sm:col-span-2"
                    : "text-sm text-muted-foreground sm:col-span-2"
                }
              >
                {tx(
                  credentials.isError
                    ? "原存储凭证无法读取，请重新填写两个密钥后保存。"
                    : "加载中",
                )}
              </p>
            )}
            <Field>
              <FieldLabel htmlFor="connection-access">
                {provider === "tencent" ? "SecretId" : "Access Key ID"}
                {!existing && (
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                )}
              </FieldLabel>
              <Input
                id="connection-access"
                aria-invalid={!!form.formState.errors.access_key}
                aria-describedby="connection-access-error"
                required={!existing || credentialsUnavailable}
                autoComplete="off"
                disabled={!credentialsReady}
                {...form.register("access_key")}
              />
              <FieldError
                id="connection-access-error"
                errors={[form.formState.errors.access_key]}
              />
            </Field>
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="connection-secret">
                  {provider === "tencent" ? "SecretKey" : "Secret Access Key"}
                  {!existing && (
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  )}
                </FieldLabel>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      onFocus={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        aria-label={tx("密钥配置说明")}
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CircleHelpIcon className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      showArrow={false}
                      side="top"
                      sideOffset={6}
                      className="max-w-xs leading-relaxed"
                    >
                      {existing
                        ? tx("两个密钥字段留空可保留原凭证。")
                        : tx(
                            "同步需要列桶权限，创建和删除需要对应的桶管理权限。",
                          )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <InputGroup>
                <InputGroupInput
                  id="connection-secret"
                  aria-invalid={!!form.formState.errors.secret_key}
                  aria-describedby="connection-secret-error"
                  type={showSecret ? "text" : "password"}
                  required={!existing || credentialsUnavailable}
                  autoComplete="new-password"
                  disabled={!credentialsReady}
                  {...form.register("secret_key")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={tx(showSecret ? "隐藏密码" : "显示密码")}
                    size="icon-xs"
                    disabled={!credentialsReady}
                    onClick={() => setShowSecret((visible) => !visible)}
                  >
                    {showSecret ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError
                id="connection-secret-error"
                errors={[form.formState.errors.secret_key]}
              />
            </Field>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="max-md:flex-row max-md:gap-2 max-md:px-3 max-md:py-2">
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              className="max-md:min-w-0 max-md:flex-[2]"
              disabled={save.isPending}
              onClick={close}
            >
              {tx("取消")}
            </DialogActionButton>
            <DialogActionButton
              type="submit"
              className="max-md:min-w-0 max-md:flex-[3]"
              disabled={save.isPending || !credentialsReady}
            >
              <SweepShine active={save.isPending}>{tx("保存")}</SweepShine>
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
