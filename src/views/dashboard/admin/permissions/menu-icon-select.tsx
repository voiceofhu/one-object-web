import {
  CheckIcon,
  ChevronsUpDownIcon,
  HashIcon,
  SearchIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { useTranslation } from "@/components/providers/language-context"
import { Button } from "@/components/ui/button"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { Input } from "@/components/ui/input"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  findMenuIconOption,
  menuIconCategories,
  menuIconOptions,
  type MenuIconCategoryValue,
} from "@/views/dashboard/menu-icons"

type MenuIconSelectProps = {
  controlId: string
  disabled?: boolean
  onChange: (value: string) => void
  value: string
}

export function MenuIconSelect({
  controlId,
  disabled,
  onChange,
  value,
}: MenuIconSelectProps) {
  const { locale } = useTranslation()
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState<MenuIconCategoryValue>("all")
  const normalizedValue = value.trim() || "#"
  const selectedOption = findMenuIconOption(normalizedValue)
  const SelectedIcon = selectedOption?.Icon ?? HashIcon
  const options = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return menuIconOptions.filter((option) => {
      const matchesCategory = category === "all" || option.category === category
      const matchesKeyword =
        !normalizedKeyword ||
        `${option.value} ${option.label[locale]}`
          .toLowerCase()
          .includes(normalizedKeyword)
      return matchesCategory && matchesKeyword
    })
  }, [category, keyword, locale])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setKeyword("")
      setCategory("all")
    }
  }

  function selectIcon(nextValue: string) {
    onChange(nextValue)
    handleOpenChange(false)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
          id={controlId}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SelectedIcon aria-hidden="true" />
            <span className="truncate">
              {selectedOption?.label[locale] ?? normalizedValue}
            </span>
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {locale === "zh-CN" ? "选择菜单图标" : "Select menu icon"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {locale === "zh-CN" ? "当前" : "Current"}：{normalizedValue}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={
                  locale === "zh-CN" ? "搜索图标名称或标识" : "Search icons"
                }
                value={keyword}
              />
            </div>
            <Select
              value={category}
              onValueChange={(nextCategory) =>
                setCategory(nextCategory as MenuIconCategoryValue)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {menuIconCategories.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {options.length > 0 ? (
            <div className="grid max-h-[52svh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {options.map((option) => {
                const Icon = option.Icon
                const selected = option.value === normalizedValue
                return (
                  <Button
                    className="h-11 justify-start gap-2 px-2 font-normal"
                    key={option.value}
                    onClick={() => selectIcon(option.value)}
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                  >
                    <Icon aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-left">
                      {option.label[locale]}
                    </span>
                    <CheckIcon
                      aria-hidden="true"
                      className={cn(!selected && "opacity-0")}
                    />
                  </Button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              {locale === "zh-CN" ? "没有匹配的图标" : "No matching icons"}
            </p>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton action="cancel" type="button">
              {locale === "zh-CN" ? "关闭" : "Close"}
            </DialogActionButton>
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
