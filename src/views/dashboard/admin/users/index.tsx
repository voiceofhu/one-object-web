import { useObjectTranslation } from "@/local/object"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useMemo, useState, type FormEvent } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DefaultUserAvatar } from "@/components/default-user-avatar"
import { Badge } from "@/components/ui/badge"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from "@/components/ui/responsive-dialog"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "@/components/providers/language-context"
import { useCurrentTime } from "@/hooks/use-current-time"
import { relativeTime } from "@/lib/format"
import { UserRowActions } from "./row-actions"
import { createUser, deleteUser, listUsers, updateUser, type User } from "./api"
import { useLocalAtom } from "@/hooks/use-local-atom"
import { ResourceTable } from "@/components/resource-table"
import { AdminErrorAlert } from "../shared/common"
import { listRoles, rbacQueryKeys, assignUserRoles } from "../api/rbac-api"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { formatAdminTime } from "../shared/format"
type Editor = {
  kind: "create" | "edit" | "roles" | "delete" | "disable"
  user?: User
}
export function UsersPanel({ permissions }: { permissions: string[] }) {
  const tx = useObjectTranslation()

  const { locale } = useTranslation()
  const now = useCurrentTime()
  const client = useQueryClient()
  const enableMutation = useMutation({
    mutationFn: (user: User) => updateUser(user, "active"),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["object-admin", "users"] }),
        client.invalidateQueries({ queryKey: authPermissionsQuery.queryKey }),
      ])
    },
  })
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | User["status"]>("all")
  const [editor, setEditor] = useLocalAtom<Editor | null>(null)
  const users = useInfiniteQuery({
    queryKey: ["object-admin", "users"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listUsers(pageParam),
    getNextPageParam: (page, all) => {
      const n = all.reduce((sum, p) => sum + p.items.length, 0)
      return n < page.total ? n : undefined
    },
  })
  const roles = useQuery({
    queryKey: rbacQueryKeys.roles,
    queryFn: listRoles,
    enabled: permissions.includes("object:role:list"),
  })
  const roleNames = useMemo(
    () => new Map(roles.data?.map((role) => [role.role_id, role.role_name])),
    [roles.data],
  )
  const data = useMemo(
    () =>
      users.data?.pages
        .flatMap((p) => p.items)
        .filter(
          (u) =>
            (status === "all" || status === u.status) &&
            `${u.display_name} ${u.oidc_sub} ${u.email ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        ) || [],
    [users.data, search, status],
  )
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "display_name",
        header: tx("用户"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-7 shrink-0">
              <AvatarImage
                src={row.original.avatar_url || undefined}
                alt={row.original.display_name}
              />
              <AvatarFallback>
                <DefaultUserAvatar seed={row.original.oidc_sub} />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <button
                type="button"
                className="max-w-64 truncate text-left font-medium underline-offset-4 enabled:hover:underline"
                disabled={
                  !permissions.includes("object:user:update") ||
                  row.original.status === "deleted" ||
                  enableMutation.isPending
                }
                onClick={() => setEditor({ kind: "edit", user: row.original })}
              >
                {row.original.display_name &&
                row.original.display_name !== row.original.oidc_sub
                  ? row.original.display_name
                  : row.original.email || tx("用户")}
              </button>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: tx("邮箱"),
        cell: ({ row }) => (
          <span
            className="block max-w-64 truncate text-muted-foreground"
            title={row.original.email ?? undefined}
          >
            {row.original.email || "—"}
          </span>
        ),
      },
      {
        accessorKey: "role_ids",
        header: tx("角色"),
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className="flex max-w-72 items-center gap-1 overflow-hidden"
            title={row.original.role_ids
              .map((id) => roleNames.get(id) || tx("未知角色"))
              .join("、")}
          >
            {row.original.role_ids.length ? (
              row.original.role_ids.map((id) => (
                <Badge key={id} variant="outline" className="min-w-0 shrink">
                  <span
                    className="truncate"
                    title={roleNames.get(id) || tx("未知角色")}
                  >
                    {roleNames.get(id) || tx("未知角色")}
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {tx("未分配角色")}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: tx("状态"),
        cell: ({ row }) =>
          row.original.status === "deleted" ? (
            <Badge variant="outline">{tx("已删除")}</Badge>
          ) : (
            <Switch
              className="motion-safe:aria-busy:animate-pulse"
              size="sm"
              checked={row.original.status === "active"}
              aria-label={tx("{0} 启用状态", {
                0:
                  row.original.display_name || row.original.email || tx("用户"),
              })}
              aria-busy={
                enableMutation.isPending &&
                enableMutation.variables?.user_id === row.original.user_id
              }
              disabled={
                !permissions.includes("object:user:update") ||
                enableMutation.isPending ||
                editor !== null
              }
              onCheckedChange={(enabled) => {
                enableMutation.reset()
                if (enabled) enableMutation.mutate(row.original)
                else setEditor({ kind: "disable", user: row.original })
              }}
            />
          ),
      },
      {
        accessorKey: "created_at",
        header: tx("创建时间"),
        cell: ({ getValue }) => (
          <time
            className="whitespace-nowrap text-muted-foreground"
            dateTime={getValue<string>()}
            title={formatAdminTime(getValue<string>())}
          >
            {relativeTime(getValue<string>(), now, locale)}
          </time>
        ),
      },
    ],
    [
      tx,
      roleNames,
      permissions,
      enableMutation,
      editor,
      setEditor,
      now,
      locale,
    ],
  )
  return (
    <>
      {enableMutation.error ? (
        <AdminErrorAlert error={enableMutation.error} />
      ) : null}
      <ResourceTable
        stickyActions
        data={data}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilter={status}
        onStatusFilterChange={setStatus}
        statusFilterOptions={[
          { value: "all", label: tx("全部") },
          { value: "active", label: tx("启用") },
          { value: "disabled", label: tx("停用") },
          { value: "deleted", label: tx("已删除") },
        ]}
        searchPlaceholder={tx("搜索已加载用户")}
        isLoading={users.isPending}
        isFetching={users.isFetching}
        error={users.error}
        onRefresh={() => users.refetch()}
        onCreate={
          permissions.includes("object:user:create")
            ? () => setEditor({ kind: "create" })
            : undefined
        }
        createLabel={tx("新增用户")}
        emptyLabel={tx("暂无用户")}
        getRowId={(u) => u.user_id}
        renderRowActions={(user) =>
          user.status !== "deleted" && (
            <UserRowActions
              name={user.display_name || user.email || tx("用户")}
              permissions={permissions}
              disabled={enableMutation.isPending}
              onEdit={() => setEditor({ kind: "edit", user })}
              onRoles={() => setEditor({ kind: "roles", user })}
              onDelete={() => setEditor({ kind: "delete", user })}
            />
          )
        }
      />
      {users.hasNextPage && (
        <div className="flex justify-center p-4">
          <Button
            variant="outline"
            disabled={users.isFetchingNextPage}
            onClick={() => void users.fetchNextPage()}
          >
            {tx("加载更多用户")}
          </Button>
        </div>
      )}
      {editor && (
        <UserDialog
          key={`${editor.kind}-${editor.user?.user_id}`}
          editor={editor}
          close={() => setEditor(null)}
          saved={async () => {
            setEditor(null)
            await client.invalidateQueries({
              queryKey: ["object-admin", "users"],
            })
            await client.invalidateQueries({
              queryKey: authPermissionsQuery.queryKey,
            })
          }}
        />
      )}
    </>
  )
}
function UserDialog({
  editor,
  close,
  saved,
}: {
  editor: Editor
  close: () => void
  saved: () => Promise<void>
}) {
  const tx = useObjectTranslation()

  const [name, setName] = useState(editor.user?.display_name || "")
  const [sub, setSub] = useState("")
  const status =
    editor.kind === "disable" || editor.user?.status === "disabled"
      ? "disabled"
      : "active"
  const [selected, setSelected] = useState(editor.user?.role_ids || [])
  const roles = useQuery({
    queryKey: rbacQueryKeys.roles,
    queryFn: listRoles,
    enabled: editor.kind === "roles",
  })
  const mutation = useMutation({
    mutationFn: async () => {
      if (editor.kind === "create") return createUser(sub, name)
      if (editor.kind === "roles")
        return assignUserRoles(editor.user!.user_id, selected)
      if (editor.kind === "delete") return deleteUser(editor.user!.user_id)
      return updateUser(
        { user_id: editor.user!.user_id, display_name: name },
        status,
      )
    },
    onSuccess: saved,
  })
  const title = {
    create: tx("新增用户"),
    edit: tx("编辑用户"),
    roles: tx("分配角色"),
    delete: tx("删除用户"),
    disable: tx("停用用户"),
  }[editor.kind]
  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close()
      }}
    >
      <ResponsiveDialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editor.kind === "create"
                ? tx("绑定已有 One User 账号，创建后再分配角色。")
                : editor.kind === "delete"
                  ? tx(
                      "确定删除用户“{0}”吗？删除后禁止访问，已上传文件和操作记录保留。",
                      {
                        0:
                          editor.user?.display_name ||
                          editor.user?.email ||
                          tx("用户"),
                      },
                    )
                  : editor.kind === "disable"
                    ? tx("确定停用用户“{0}”吗？停用后将禁止访问。", {
                        0:
                          editor.user?.display_name ||
                          editor.user?.email ||
                          tx("用户"),
                      })
                    : editor.user?.display_name}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-4">
            {mutation.error && <AdminErrorAlert error={mutation.error} />}
            {editor.kind === "create" && (
              <Field>
                <FieldLabel htmlFor="oidc-sub">
                  {tx("One User 账号标识")}
                </FieldLabel>
                <Input
                  id="oidc-sub"
                  required
                  maxLength={255}
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                />
              </Field>
            )}
            {(editor.kind === "create" || editor.kind === "edit") && (
              <Field>
                <FieldLabel htmlFor="display-name">{tx("显示名称")}</FieldLabel>
                <Input
                  id="display-name"
                  required
                  maxLength={128}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            {editor.kind === "roles" && (
              <>
                {roles.error && <AdminErrorAlert error={roles.error} />}
                <div className="space-y-3">
                  {roles.data?.map((role) => (
                    <label
                      key={role.role_id}
                      className="flex items-center gap-3"
                    >
                      <Checkbox
                        disabled={role.status !== "active"}
                        checked={selected.includes(role.role_id)}
                        onCheckedChange={(checked) =>
                          setSelected((current) =>
                            checked
                              ? [...current, role.role_id]
                              : current.filter((id) => id !== role.role_id),
                          )
                        }
                      />
                      {role.role_name}
                      {role.status !== "active" && tx("（已停用）")}
                    </label>
                  ))}
                </div>
              </>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <DialogActionButton
                action="cancel"
                type="button"
                variant="outline"
                disabled={mutation.isPending}
              >
                {tx("取消")}
              </DialogActionButton>
            </ResponsiveDialogClose>
            <DialogActionButton
              type="submit"
              disabled={
                mutation.isPending ||
                (editor.kind === "roles" && (roles.isPending || roles.isError))
              }
              loading={mutation.isPending}
              variant={
                editor.kind === "delete" || editor.kind === "disable"
                  ? "destructive"
                  : "default"
              }
            >
              {editor.kind === "delete"
                ? tx("确认删除")
                : editor.kind === "disable"
                  ? tx("确认停用")
                  : tx("确认")}
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
