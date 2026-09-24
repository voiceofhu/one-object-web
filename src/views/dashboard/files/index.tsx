import {
  filePath,
  filePrefix,
  readFileLocation,
  saveFileLocation,
} from "./location"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router"
import { useForm } from "react-hook-form"
import { RefreshCwIcon, SearchIcon } from "lucide-react"
import { toast } from "@/lib/toast"
import { useObjectTranslation } from "@/local/object"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Loading, Failure, NoItems } from "@/components/async-state"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { listAccounts, listConnections } from "@/views/dashboard/storage/api"
import { UploadControl } from "@/views/dashboard/files/uploads/components/upload-control"
import { listStorageObjects } from "./api"
import { refreshWithRotation } from "./refresh"
import { ObjectDirectory } from "./components/object-directory"
import { PathBar } from "./components/path-bar"
import { StorageTree } from "./components/storage-tree"

export default function FilesPage() {
  const tx = useObjectTranslation()
  const location = useLocation()
  const access = useQuery(authPermissionsQuery)
  const saved = readFileLocation(access.data?.user_id)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requestedStorageId = id || params.get("storage") || ""
  const explicitPrefix =
    filePrefix(location.pathname) || params.get("prefix") || ""
  const view =
    params.get("view") === "files"
      ? "files"
      : params.get("view") === "folders"
        ? "folders"
        : (saved?.view ?? "folders")
  const [uploadOpen, setUploadOpen] = useState(
    () => params.get("upload") === "1",
  )
  const connections = useQuery({
    queryKey: ["storage-connections"],
    queryFn: ({ signal }) => listConnections(signal),
  })
  const accounts = useQuery({
    queryKey: ["storage-accounts"],
    queryFn: ({ signal }) => listAccounts(signal),
  })
  const savedAvailable =
    saved && connections.data?.items.some((item) => item.id === saved.storageId)
  const storageId =
    requestedStorageId ||
    (savedAvailable ? saved.storageId : connections.data?.items[0]?.id) ||
    ""
  const prefix =
    requestedStorageId || params.has("prefix")
      ? explicitPrefix
      : savedAvailable
        ? saved.prefix
        : ""
  const requestedFocus = params.get("focus") || ""
  const focusedKey = requestedFocus.startsWith(prefix) ? requestedFocus : ""
  const selectedConnection = connections.data?.items.find(
    (item) => item.id === storageId,
  )
  useEffect(() => {
    if (id && selectedConnection && !params.has("prefix")) {
      saveFileLocation(access.data?.user_id, { storageId, prefix, view })
    }
  }, [
    id,
    selectedConnection,
    params,
    access.data?.user_id,
    storageId,
    prefix,
    view,
  ])
  const form = useForm({ values: { prefix } })
  const browseKey = `${storageId}\u0000${prefix}\u0000${view}\u0000${focusedKey}`
  const [storagePage, setStoragePage] = useState<{
    key: string
    cursor: string
    history: string[]
  }>({ key: "", cursor: "", history: [] })
  const currentPage = useMemo(
    () =>
      storagePage.key === browseKey
        ? storagePage
        : { key: browseKey, cursor: "", history: [] },
    [browseKey, storagePage],
  )
  const objects = useQuery({
    queryKey: [
      "storage-objects",
      storageId,
      prefix,
      view,
      currentPage.cursor,
      focusedKey,
    ],
    queryFn: ({ signal }) =>
      listStorageObjects(
        storageId,
        focusedKey || prefix,
        currentPage.cursor || undefined,
        signal,
        !!focusedKey || view === "files",
      ),
    enabled: !!selectedConnection,
  })
  const refresh = useMutation({
    mutationFn: () =>
      refreshWithRotation(() => objects.refetch({ throwOnError: true })),
    onSuccess: () => toast.success(tx("文件列表已刷新")),
    onError: (error) =>
      toast.error(tx("文件列表刷新失败"), { description: tx(error.message) }),
  })
  const refreshDirectory = useMutation({
    mutationFn: () =>
      refreshWithRotation(() =>
        Promise.all([
          connections.refetch({ throwOnError: true }),
          accounts.refetch({ throwOnError: true }),
        ]),
      ),
    onSuccess: () => toast.success(tx("存储桶列表已刷新")),
    onError: (error) =>
      toast.error(tx("存储桶列表刷新失败"), { description: tx(error.message) }),
  })
  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params)
    next.delete("storage")
    next.delete("prefix")
    next.delete("focus")
    next.delete("search")
    next.delete("offset")
    for (const [key, value] of Object.entries(updates)) {
      if (key === "prefix") continue
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.set(
      "view",
      updates.view === "files"
        ? "files"
        : updates.view === "folders"
          ? "folders"
          : view,
    )
    setStoragePage({ key: "", cursor: "", history: [] })
    navigate({
      pathname: filePath(storageId, updates.prefix ?? prefix),
      search: `?${next}`,
    })
  }
  const openStorage = (nextId: string) => {
    if (nextId === storageId) return
    const next = new URLSearchParams({ view })
    if (params.get("upload") === "1") next.set("upload", "1")
    navigate({ pathname: filePath(nextId), search: `?${next}` })
  }
  const openFolder = (path: string) => updateParams({ prefix: path })

  if (connections.isPending || accounts.isPending || access.isPending)
    return <Loading />
  if (connections.error && !connections.data)
    return (
      <Failure
        error={connections.error}
        retry={() => void connections.refetch()}
      />
    )
  if (accounts.error && !accounts.data)
    return (
      <Failure error={accounts.error} retry={() => void accounts.refetch()} />
    )
  if (
    storageId &&
    (!id ||
      params.has("storage") ||
      params.has("prefix") ||
      !params.has("view"))
  ) {
    const next = new URLSearchParams(params)
    next.delete("storage")
    next.delete("prefix")
    next.set("view", view)
    next.delete("search")
    next.delete("offset")
    return (
      <Navigate
        replace
        to={{
          pathname: filePath(storageId, prefix),
          search: `?${next}`,
        }}
      />
    )
  }

  return (
    <section className="files-page flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex-row">
      <StorageTree
        accounts={accounts.data.items}
        connections={connections.data.items}
        selectedStorageId={storageId}
        onSelectStorage={openStorage}
        onRefresh={() => refreshDirectory.mutate()}
        refreshing={refreshDirectory.isPending}
        isFetching={accounts.isFetching || connections.isFetching}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {selectedConnection ? (
          <>
            <header className="flex h-9 min-h-9 shrink-0 flex-nowrap items-center gap-1 border-b px-2 py-0.5 md:h-10 md:min-h-10 md:gap-2 md:px-3 md:py-1">
              <PathBar
                bucket={selectedConnection.bucket}
                prefix={prefix}
                onNavigate={openFolder}
              />
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {access.data?.permissions.includes("object:uploads:write") && (
                  <UploadControl
                    connections={connections.data.items}
                    defaultStorageId={storageId}
                    defaultPrefix={
                      prefix.endsWith("/")
                        ? prefix
                        : prefix.slice(0, prefix.lastIndexOf("/") + 1)
                    }
                    open={uploadOpen}
                    onOpenChange={(open) => {
                      setUploadOpen(open)
                      if (!open && params.has("upload"))
                        updateParams({ upload: "" })
                    }}
                  />
                )}
                <Button
                  size="icon-sm"
                  className="md:size-8"
                  variant="outline"
                  aria-label={tx("刷新")}
                  title={tx("刷新")}
                  aria-busy={refresh.isPending}
                  disabled={refresh.isPending || objects.isFetching}
                  onClick={() => refresh.mutate()}
                >
                  <RefreshCwIcon
                    className={
                      refresh.isPending
                        ? "animate-spin motion-reduce:animate-none"
                        : undefined
                    }
                    style={{ animationDuration: "1s" }}
                  />
                </Button>
              </div>
            </header>
            <div className="flex min-h-0 shrink-0 flex-wrap items-center justify-between gap-1 border-b bg-muted/20 px-2 py-1 md:h-14 md:flex-nowrap md:gap-2 md:px-3 md:py-2">
              <form
                className="flex w-full min-w-0 items-center gap-1 md:w-auto md:max-w-md md:flex-1 md:gap-2"
                onSubmit={form.handleSubmit(({ prefix: value }) =>
                  openFolder(value),
                )}
              >
                <Input
                  aria-label={tx("按前缀搜索对象")}
                  placeholder={tx("按前缀搜索对象")}
                  maxLength={1024}
                  className="h-7 min-w-0 !min-h-0 flex-1 text-sm md:h-8"
                  {...form.register("prefix")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 !min-h-0 px-2 text-xs md:h-8 md:px-2.5 md:text-sm"
                  type="submit"
                  aria-label={tx("搜索")}
                  disabled={objects.isFetching}
                >
                  <SearchIcon />
                  <span className="hidden xl:inline">{tx("搜索")}</span>
                </Button>
              </form>
              <label className="flex h-7 min-h-7 shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground md:h-8 md:min-h-8 md:gap-2 md:text-sm">
                <Checkbox
                  checked={view === "folders"}
                  aria-label={tx("将前缀显示为文件夹")}
                  onCheckedChange={(checked) =>
                    updateParams({
                      view: checked === true ? "folders" : "files",
                    })
                  }
                />
                <span className="hidden 2xl:inline">
                  {tx("将前缀显示为文件夹")}
                </span>
                <span className="2xl:hidden">{tx("文件夹模式")}</span>
              </label>
            </div>
            {focusedKey && (
              <div className="flex h-8 shrink-0 items-center gap-1 border-b px-2 py-0.5 text-xs md:h-auto md:gap-2 md:px-3 md:py-1">
                <span className="min-w-0 flex-1 truncate" title={focusedKey}>
                  {tx("定位文件：{0}", { 0: focusedKey })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateParams({})}
                >
                  {tx("查看所在文件夹")}
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              {objects.isPending ? (
                <Loading />
              ) : objects.error ? (
                <Failure error={objects.error} retry={() => refresh.mutate()} />
              ) : (
                <ObjectDirectory
                  key={`${browseKey}\u0000${currentPage.cursor}`}
                  storageId={storageId}
                  canDelete={
                    access.data?.permissions.includes("object:files:delete") ??
                    false
                  }
                  items={
                    focusedKey
                      ? objects.data.items.filter(
                          (item) => item.key === focusedKey,
                        )
                      : objects.data.items
                  }
                  focusedKey={focusedKey}
                  view={view}
                  onOpenFolder={openFolder}
                  onUpload={
                    selectedConnection.enabled &&
                    access.data?.permissions.includes("object:uploads:write")
                      ? () => setUploadOpen(true)
                      : undefined
                  }
                />
              )}
            </div>
            {objects.data &&
              !focusedKey &&
              (currentPage.history.length > 0 || objects.data.has_more) && (
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-t px-2 py-1 text-xs md:gap-2 md:px-3 md:py-2 lg:px-4">
                  <span className="text-muted-foreground">
                    {tx("第 {0} 页 · 当前页 {1} 项", {
                      0: currentPage.history.length + 1,
                      1: objects.data.items.length,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !currentPage.history.length ||
                        objects.isFetching ||
                        refresh.isPending
                      }
                      onClick={() =>
                        setStoragePage({
                          key: browseKey,
                          cursor: currentPage.history.at(-1)!,
                          history: currentPage.history.slice(0, -1),
                        })
                      }
                    >
                      {tx("上一页")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !objects.data.has_more ||
                        objects.isFetching ||
                        refresh.isPending
                      }
                      onClick={() => {
                        const cursor = objects.data?.next_cursor
                        if (cursor)
                          setStoragePage({
                            key: browseKey,
                            cursor,
                            history: [
                              ...currentPage.history,
                              currentPage.cursor,
                            ],
                          })
                      }}
                    >
                      {tx("下一页")}
                    </Button>
                  </div>
                </footer>
              )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <NoItems
              title={tx(
                requestedStorageId ? "存储桶不存在或无权访问" : "暂无存储桶",
              )}
              description={tx(
                !accounts.data.items.length
                  ? "添加厂商账号后，即可接入存储桶并上传文件。"
                  : "请从左侧选择存储桶，或先在桶管理中配置接入。",
              )}
            >
              {!connections.data.items.length &&
                (!accounts.data.items.length &&
                access.data?.permissions.includes("object:storage:write") ? (
                  <Button asChild size="sm">
                    <Link to="/dashboard/storage?create=1">
                      {tx("添加厂商账号")}
                    </Link>
                  </Button>
                ) : access.data?.permissions.includes("object:bucket:read") ? (
                  <Button asChild size="sm">
                    <Link to="/dashboard/buckets">{tx("配置存储桶")}</Link>
                  </Button>
                ) : null)}
            </NoItems>
          </div>
        )}
      </div>
    </section>
  )
}
