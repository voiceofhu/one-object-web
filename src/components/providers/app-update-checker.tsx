import { UpdateNotice } from "@/components/ui/update-notice"

// One UI notice: polls for a new build, "稍后提醒" snoozes until tomorrow.
export function AppUpdateChecker() {
  return (
    <UpdateNotice
      labels={{
        title: "新版本已发布",
        description: "点击更新，刷新页面后即可使用新版本。",
        action: "立即更新",
        updating: "正在更新…",
        later: "稍后提醒",
      }}
    />
  )
}
