import type { IdentityPermission } from "@/views/dashboard/admin/api/rbac-api"

export type PermissionNode = IdentityPermission & { children: PermissionNode[] }
export type PermissionCheckedState = boolean | "indeterminate"

export function buildPermissionTree(permissions: IdentityPermission[]) {
  const nodes = new Map<string, PermissionNode>()
  permissions.forEach((permission) => {
    nodes.set(permission.permission_id, { ...permission, children: [] })
  })
  const roots: PermissionNode[] = []
  nodes.forEach((node) => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  const sort = (items: PermissionNode[]) => {
    items.sort(
      (left, right) =>
        left.order_num - right.order_num ||
        left.permission_id.localeCompare(right.permission_id),
    )
    items.forEach((item) => sort(item.children))
  }
  sort(roots)
  return roots
}

export function collectPermissionIds(node: PermissionNode): string[] {
  return [
    node.permission_id,
    ...node.children.flatMap((child) => collectPermissionIds(child)),
  ]
}

export function buildPermissionNodeMap(tree: PermissionNode[]) {
  const nodes = new Map<string, PermissionNode>()
  const visit = (items: PermissionNode[]) => {
    items.forEach((node) => {
      nodes.set(node.permission_id, node)
      visit(node.children)
    })
  }
  visit(tree)
  return nodes
}

export function getPermissionNodeCheckedState(
  node: PermissionNode,
  selected: Set<string>,
  selectableIds: Set<string>,
  linked: boolean,
): PermissionCheckedState {
  if (!linked) {
    return (
      selectableIds.has(node.permission_id) && selected.has(node.permission_id)
    )
  }
  const ids = collectPermissionIds(node).filter((id) => selectableIds.has(id))
  if (ids.length === 0) return false
  const selectedCount = ids.filter((id) => selected.has(id)).length
  if (selectedCount === ids.length) return true
  return selectedCount > 0 ? "indeterminate" : false
}

export function normalizeLinkedPermissions(
  selected: Set<string>,
  tree: PermissionNode[],
  parentById: Map<string, string | null>,
  selectableIds: Set<string>,
) {
  const next = new Set(selected)
  const visit = (items: PermissionNode[]) => {
    items.forEach((node) => {
      if (selected.has(node.permission_id)) {
        collectPermissionIds(node)
          .filter((id) => selectableIds.has(id))
          .forEach((id) => next.add(id))
        let parentId = parentById.get(node.permission_id) ?? null
        while (parentId) {
          if (selectableIds.has(parentId)) next.add(parentId)
          parentId = parentById.get(parentId) ?? null
        }
      }
      visit(node.children)
    })
  }
  visit(tree)
  return next
}

export function removeEmptyPermissionAncestors(
  selected: Set<string>,
  permissionId: string,
  parentById: Map<string, string | null>,
  nodeById: Map<string, PermissionNode>,
) {
  let parentId = parentById.get(permissionId) ?? null
  while (parentId) {
    const parent = nodeById.get(parentId)
    if (
      parent &&
      !parent.children.some((child) =>
        collectPermissionIds(child).some((id) => selected.has(id)),
      )
    ) {
      selected.delete(parentId)
    }
    parentId = parentById.get(parentId) ?? null
  }
}

export function flattenPermissionNodes(node: PermissionNode): PermissionNode[] {
  return [
    node,
    ...node.children.flatMap((child) => flattenPermissionNodes(child)),
  ]
}

export function filterPermissionTree(
  nodes: PermissionNode[],
  matches: (permission: PermissionNode) => boolean,
): PermissionNode[] {
  return nodes.flatMap((node) => {
    const children = filterPermissionTree(node.children, matches)
    return matches(node) || children.length > 0 ? [{ ...node, children }] : []
  })
}

export function reorderPermissionItems(
  items: IdentityPermission[] | undefined,
  parentId: string | null,
  siblingIds: string[],
) {
  if (!items) return items
  const orderNums = items
    .filter((permission) => permission.parent_id === parentId)
    .map((permission) => permission.order_num)
    .sort((left, right) => left - right)
  const orderById = new Map(
    siblingIds.map((permissionId, index) => [
      permissionId,
      orderNums[index] ?? index + 1,
    ]),
  )
  return items.map((permission) => {
    const orderNum = orderById.get(permission.permission_id)
    return orderNum === undefined
      ? permission
      : { ...permission, order_num: orderNum }
  })
}

export function permissionTypeLabel(
  type: IdentityPermission["permission_type"],
  locale: "zh-CN" | "en-US",
) {
  if (type === "M") return locale === "zh-CN" ? "目录" : "Group"
  if (type === "C") return locale === "zh-CN" ? "菜单" : "Menu"
  return locale === "zh-CN" ? "按钮" : "Action"
}

export function statusText(status: string, locale: "zh-CN" | "en-US") {
  if (status === "active") return locale === "zh-CN" ? "启用" : "Active"
  return locale === "zh-CN" ? "停用" : "Disabled"
}
