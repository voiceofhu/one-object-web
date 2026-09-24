import { useEffect, useId, useRef, useState } from "react"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { useObjectTranslation } from "@/local/object"
import { DefaultUserAvatar } from "@/components/default-user-avatar"
import { UploadIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { Slider } from "radix-ui"
import CropEditor, { type AvatarEditorRef } from "react-avatar-editor"

const checkerboardStyle = {
  backgroundColor: "#fff",
  backgroundImage:
    "conic-gradient(#e4e4e7 25%, #fff 0 50%, #e4e4e7 0 75%, #fff 0)",
  backgroundSize: "16px 16px",
}

export function ImageCropUpload({
  value,
  seed,
  onChange,
  disabled = false,
}: {
  value?: string | null
  seed: string
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const tx = useObjectTranslation()
  const input = useRef<HTMLInputElement>(null)
  const editor = useRef<AvatarEditorRef>(null)
  const previewFrame = useRef<number | null>(null)
  const zoomLabel = useId()
  const [file, setFile] = useState<File | null>(null)
  const [scale, setScale] = useState(1)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(
    () => () => {
      if (previewFrame.current !== null)
        cancelAnimationFrame(previewFrame.current)
    },
    [],
  )
  const refreshPreview = () => {
    if (previewFrame.current !== null) return
    previewFrame.current = requestAnimationFrame(() => {
      previewFrame.current = null
      const canvas = editor.current?.getImageScaledToCanvas()
      if (canvas) setPreviewUrl(canvas.toDataURL("image/png"))
    })
  }
  const close = () => {
    if (previewFrame.current !== null)
      cancelAnimationFrame(previewFrame.current)
    previewFrame.current = null
    setFile(null)
    setError("")
    setPreviewUrl(null)
  }
  const confirm = () => {
    try {
      const source = editor.current?.getImageScaledToCanvas()
      if (!source) throw new Error("图片尚未就绪")
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 128
      const context = canvas.getContext("2d")
      if (!context) throw new Error("无法处理图片，请重试")
      context.drawImage(source, 0, 0, 128, 128)
      onChange(canvas.toDataURL("image/png"))
      close()
    } catch (error) {
      setError(error instanceof Error ? error.message : "裁剪失败，请重试")
    }
  }
  return (
    <div className="shrink-0 space-y-1">
      <div className="relative w-fit">
        <button
          type="button"
          disabled={disabled}
          aria-label={tx(value ? "更换图标" : "上传图标")}
          title={tx("PNG / JPEG / WebP，最大 5 MB")}
          onClick={() => input.current?.click()}
          className="group relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value ? (
            <img
              src={value}
              alt={tx("应用图标")}
              className="size-full object-contain"
            />
          ) : (
            <DefaultUserAvatar seed={seed} />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <UploadIcon className="size-5" aria-hidden="true" />
          </span>
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled}
            aria-label={tx("移除")}
            title={tx("移除")}
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <input
        ref={input}
        aria-label={tx("选择应用图标")}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const selected = event.target.files?.[0]
          event.target.value = ""
          if (!selected) return
          setError("")
          setPreviewUrl(null)
          if (
            !selected.size ||
            selected.size > 5 * 1024 * 1024 ||
            !["image/png", "image/jpeg", "image/webp"].includes(selected.type)
          ) {
            setError("请选择不超过 5 MB 的 PNG、JPEG 或 WebP 图片")
            return
          }
          setScale(1)
          setReady(false)
          setFile(selected)
        }}
      />
      {!file && error && (
        <p role="alert" className="text-xs text-destructive">
          {tx(error)}
        </p>
      )}
      <ResponsiveDialog
        open={!!file}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <ResponsiveDialogContent className="max-h-[92svh] sm:max-w-[600px]">
          <ResponsiveDialogHeader className="bg-transparent px-4 pt-4 pb-3">
            <ResponsiveDialogTitle>{tx("裁剪应用图标")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {tx("拖动图片，调整缩放。")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-3 overflow-y-auto pt-0 pb-4">
            <div
              className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_176px]"
              data-vaul-no-drag
            >
              <div className="mx-auto w-full max-w-[288px] space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {tx("编辑")}
                </p>
                <div
                  className="relative flex w-full justify-center overflow-hidden rounded-xl border border-border"
                  style={checkerboardStyle}
                >
                  {file && (
                    <CropEditor
                      ref={editor}
                      image={file}
                      width={240}
                      height={240}
                      border={24}
                      borderRadius={0}
                      scale={scale}
                      color={[15, 23, 42, 0.45]}
                      borderColor={[255, 255, 255, 1]}
                      onImageReady={() => {
                        setReady(true)
                        refreshPreview()
                      }}
                      onPositionChange={refreshPreview}
                      onMouseUp={refreshPreview}
                      onLoadFailure={() => {
                        setReady(false)
                        setError("无法读取图片，请换一张图片")
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        maxWidth: "100%",
                        height: "auto",
                        touchAction: "none",
                        cursor: "grab",
                      }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[8.33%] border-2 border-white shadow-[0_0_0_2px_rgba(37,99,235,0.85)]"
                  />
                </div>
                <div className="space-y-2 rounded-lg bg-muted/60 px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span id={zoomLabel} className="text-muted-foreground">
                      {tx("缩放")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {Math.round(scale * 100)}%
                    </span>
                  </div>
                  <div className="flex h-5 items-center gap-3">
                    <ZoomOutIcon
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <Slider.Root
                      className="relative flex h-5 min-w-0 flex-1 touch-none items-center select-none data-disabled:opacity-50"
                      min={1}
                      max={3}
                      step={0.01}
                      value={[scale]}
                      disabled={!ready || disabled}
                      onValueChange={([value]) => {
                        setScale(value)
                        refreshPreview()
                      }}
                    >
                      <Slider.Track className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <Slider.Range className="absolute h-full bg-primary" />
                      </Slider.Track>
                      <Slider.Thumb
                        aria-labelledby={zoomLabel}
                        className="block size-3.5 rounded-full border border-primary/30 bg-background shadow-sm ring-primary/20 transition-shadow outline-none hover:ring-4 focus-visible:ring-4"
                      />
                    </Slider.Root>
                    <ZoomInIcon
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {tx("预览")}
                </p>
                <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 px-3 py-5">
                  <div
                    className="size-20 overflow-hidden rounded-lg border border-border"
                    style={checkerboardStyle}
                  >
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt={tx("裁剪预览")}
                        className="size-full object-contain"
                      />
                    )}
                  </div>
                  <div
                    className="size-10 overflow-hidden rounded-md border border-border"
                    style={checkerboardStyle}
                    aria-hidden="true"
                  >
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt=""
                        className="size-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {tx(error)}
              </p>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="border-t bg-transparent py-3">
            <DialogActionButton action="cancel" onClick={close}>
              {tx("取消")}
            </DialogActionButton>
            <DialogActionButton disabled={!ready || disabled} onClick={confirm}>
              {tx("确认")}
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
