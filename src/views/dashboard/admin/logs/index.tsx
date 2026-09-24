import { useObjectTranslation } from "@/local/object"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { listLogs, type Log } from "./api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResourceTable } from "@/components/resource-table"
import { formatAdminTime } from "../shared/format"
export function LogsPanel({ kind }: { kind: "login" | "operation" }) {
  const tx = useObjectTranslation()

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "success" | "failure">("all")
  const logs = useInfiniteQuery({
    queryKey: ["object-admin", `${kind}-logs`],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listLogs(kind, pageParam),
    getNextPageParam: (page, all) => {
      const n = all.reduce((sum, p) => sum + p.items.length, 0)
      return n < page.total ? n : undefined
    },
  })
  const columns = useMemo<ColumnDef<Log>[]>(
    () => [
      {
        accessorKey: "owner_sub",
        header: tx("操作人"),
        cell: ({ getValue }) => getValue() || tx("未验证身份"),
      },
      ...(kind === "operation"
        ? [
            { accessorKey: "method", header: tx("请求方式") },
            { accessorKey: "route", header: tx("操作路径") },
            { accessorKey: "duration_ms", header: tx("耗时 (ms)") },
          ]
        : []),
      {
        accessorKey: "status",
        header: tx("结果"),
        cell: ({ row }) => (
          <Badge
            variant={row.original.status < 400 ? "secondary" : "destructive"}
          >
            {row.original.status < 400 ? tx("成功") : tx("失败")} ·{" "}
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "peer_ip",
        header: tx("连接 IP"),
        cell: ({ getValue }) => getValue() || "—",
      },
      {
        accessorKey: "created_at",
        header: tx("时间"),
        cell: ({ getValue }) => formatAdminTime(getValue<string>()),
      },
    ],
    [tx, kind],
  )
  const data = useMemo(
    () =>
      logs.data?.pages
        .flatMap((p) => p.items)
        .filter(
          (l) =>
            (filter === "all" ||
              (filter === "success" ? l.status < 400 : l.status >= 400)) &&
            `${l.owner_sub || ""} ${l.route || ""} ${l.peer_ip || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        ) || [],
    [logs.data, search, filter],
  )
  return (
    <>
      <p className="px-5 py-3 text-xs text-muted-foreground">
        {tx(
          kind === "login"
            ? "保留最近 7 天的登录日志，由 PostgreSQL 定期清理。"
            : "保留最近 7 天的操作日志，由 PostgreSQL 定期清理。",
        )}
      </p>
      <ResourceTable
        data={data}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilter={filter}
        onStatusFilterChange={setFilter}
        statusFilterOptions={[
          { value: "all", label: tx("全部") },
          { value: "success", label: tx("成功") },
          { value: "failure", label: tx("失败") },
        ]}
        searchPlaceholder={tx("搜索已加载日志")}
        isLoading={logs.isPending}
        isFetching={logs.isFetching}
        error={logs.error}
        onRefresh={() => logs.refetch()}
        emptyLabel={tx("暂无日志")}
        getRowId={(l) => l.id}
      />
      {logs.hasNextPage && (
        <div className="flex justify-center p-4">
          <Button
            variant="outline"
            disabled={logs.isFetchingNextPage}
            onClick={() => void logs.fetchNextPage()}
          >
            {tx("加载更多日志")}
          </Button>
        </div>
      )}
    </>
  )
}
