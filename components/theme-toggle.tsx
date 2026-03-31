"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="w-9 h-9 border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70"
        disabled
      />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="
            w-9 h-9 relative
            border-slate-200 dark:border-slate-700
            bg-white/80 dark:bg-slate-900/80
            backdrop-blur
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-all
            shadow-sm
          "
        >
          {/* Light icon */}
          <Sun
            className="
              h-[1.2rem] w-[1.2rem]
              rotate-0 scale-100 transition-all
              dark:-rotate-90 dark:scale-0
              text-amber-500
            "
          />

          {/* Dark icon */}
          <Moon
            className="
              absolute
              h-[1.2rem] w-[1.2rem]
              rotate-90 scale-0 transition-all
              dark:rotate-0 dark:scale-100
              text-sky-400
            "
          />

          <span className="sr-only">สลับโหมดหน้าจอ</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          shadow-md
        "
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`
            flex items-center gap-2
            cursor-pointer
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${theme === "light" ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""}
          `}
        >
          <Sun className="h-4 w-4 text-amber-500" />
          <span className="text-slate-700 dark:text-slate-200">สว่าง</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`
            flex items-center gap-2
            cursor-pointer
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${theme === "dark" ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""}
          `}
        >
          <Moon className="h-4 w-4 text-sky-400" />
          <span className="text-slate-700 dark:text-slate-200">มืด</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`
            flex items-center gap-2
            cursor-pointer
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${theme === "system" ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""}
          `}
        >
          <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-slate-700 dark:text-slate-200">
            ตามระบบ
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}