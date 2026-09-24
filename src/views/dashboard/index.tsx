import { useObjectTranslation } from "@/local/object"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  DatabaseIcon,
  FilesIcon,
  CloudIcon,
  UploadIcon,
} from "lucide-react"
import { Loading, Failure, NoItems } from "@/components/async-state"
import { SweepShine } from "@/components/sweep-shine"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RecentFiles } from "./components/recent-files"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { listFiles } from "@/views/dashboard/files/api"
import { listAccounts, listConnections } from "@/views/dashboard/storage/api"
import { getLiveness, getReadiness } from "./api"
import { MetricCard } from "./components/metric-card"
import { ServiceStatusCard } from "./components/service-status-card"

export default function Dashboard() {
  const tx = useObjectTranslation()

  const access = useQuery(authPermissionsQuery)
  const can = (permission: string) =>
    access.data?.permissions.includes(permission) ?? false
  const canFiles = can("object:files:read")
  const canStorage = can("object:storage:read")
  const canBuckets = can("object:bucket:read")
  const files = useQuery({
    queryKey: ["files", 0, ""],
    queryFn: ({ signal }) => listFiles(0, "", signal),
    enabled: canFiles,
  })
  const accounts = useQuery({
    queryKey: ["storage-accounts"],
    queryFn: ({ signal }) => listAccounts(signal),
    enabled: canStorage,
  })
  const storage = useQuery({
    queryKey: ["storage-connections"],
    queryFn: ({ signal }) => listConnections(signal),
    enabled: canStorage || canBuckets,
  })
  const liveness = useQuery({
    queryKey: ["service-status", "liveness"],
    queryFn: getLiveness,
  })
  const readiness = useQuery({
    queryKey: ["service-status", "readiness"],
    queryFn: getReadiness,
  })
  const metric = (
    allowed: boolean,
    pending: boolean,
    value: string | number | undefined,
  ) =>
    !allowed ? (
      "—"
    ) : pending ? (
      <SweepShine>{tx("加载中")}</SweepShine>
    ) : (
      (value ?? "—")
    )
  if (access.isPending) return <Loading />
  if (access.error)
    return <Failure error={access.error} retry={() => void access.refetch()} />
  return (
    <section
      aria-labelledby="dashboard-heading"
      className="flex w-full flex-col gap-3 p-3 lg:p-4"
    >
      <div className="flex flex-wrap items-center justify-end gap-3">
        <h1 className="sr-only" id="dashboard-heading">
          {tx("仪表盘")}
        </h1>
        {can("object:uploads:write") && (
          <Button asChild size="sm">
            <Link to="/dashboard/files?upload=1">
              <UploadIcon />
              {tx("上传文件")}
            </Link>
          </Button>
        )}
      </div>
      {(canFiles || canStorage || canBuckets) && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {canFiles && (
            <MetricCard
              label={tx("文件总数")}
              icon={FilesIcon}
              href="/dashboard/files"
              value={metric(true, files.isPending, files.data?.total)}
              detail={tx("当前账户可访问的文件")}
            />
          )}
          {canStorage && (
            <MetricCard
              label={tx("厂商数量")}
              icon={CloudIcon}
              href="/dashboard/storage"
              value={metric(
                true,
                accounts.isPending,
                accounts.data?.items.length,
              )}
              detail={tx("已配置的厂商账户")}
            />
          )}
          {canBuckets && (
            <MetricCard
              label={tx("存储桶")}
              icon={DatabaseIcon}
              href="/dashboard/buckets"
              value={metric(
                true,
                storage.isPending,
                storage.data?.items.length,
              )}
              detail={
                storage.isPending
                  ? tx("加载启用状态中")
                  : storage.error
                    ? tx("加载失败")
                    : (storage.data?.items.filter((c) => c.enabled).length ??
                        0) + tx(" 个已启用")
              }
            />
          )}
        </div>
      )}
      {canFiles && (
        <div className="grid min-w-0 gap-3">
          <Card size="sm" className="min-w-0 border-0 shadow-none ring-0">
            <CardHeader>
              <CardTitle>{tx("最近上传")}</CardTitle>
              <CardDescription>
                {tx("当前账户最近上传的 6 个文件。")}
              </CardDescription>
              {canFiles && (
                <CardAction>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/dashboard/files">
                      {tx("查看全部")}
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="min-w-0">
              {files.isPending ? (
                <Loading />
              ) : files.error ? (
                <Failure
                  error={files.error}
                  retry={() => void files.refetch()}
                />
              ) : files.data.items.length === 0 ? (
                <NoItems
                  title={tx("暂无文件")}
                  description={tx(
                    accounts.isSuccess && !accounts.data.items.length
                      ? "添加厂商账号后，即可接入存储桶并上传文件。"
                      : storage.isSuccess && !storage.data.items.length
                        ? "先配置存储桶，再上传文件。"
                        : "上传文件后，会在这里显示。",
                  )}
                >
                  {accounts.isSuccess &&
                  !accounts.data.items.length &&
                  can("object:storage:write") ? (
                    <Button asChild size="sm">
                      <Link to="/dashboard/storage?create=1">
                        {tx("添加厂商账号")}
                      </Link>
                    </Button>
                  ) : storage.isSuccess &&
                    !storage.data.items.length &&
                    canBuckets ? (
                    <Button asChild size="sm">
                      <Link to="/dashboard/buckets">{tx("配置存储桶")}</Link>
                    </Button>
                  ) : can("object:uploads:write") &&
                    ((!canStorage && !canBuckets) ||
                      storage.data?.items.some((item) => item.enabled)) ? (
                    <Button asChild size="sm">
                      <Link to="/dashboard/files?upload=1">
                        {tx("上传文件")}
                      </Link>
                    </Button>
                  ) : null}
                </NoItems>
              ) : (
                <RecentFiles files={files.data.items.slice(0, 6)} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {accounts.error && canStorage && (
        <Failure error={accounts.error} retry={() => void accounts.refetch()} />
      )}
      <section aria-labelledby="service-status-heading" className="grid gap-3">
        <h2 id="service-status-heading" className="text-sm font-medium">
          {tx("服务与资源")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ServiceStatusCard
            titleKey="status.liveness.title"
            descriptionKey="status.liveness.description"
            query={liveness}
          />
          <ServiceStatusCard
            titleKey="status.readiness.title"
            descriptionKey="status.readiness.description"
            query={readiness}
          />
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-card px-3.5 py-2.5 shadow-none sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-medium">{tx("应用接入")}</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/guide">
                {tx("接入指南")}
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </section>
  )
}
