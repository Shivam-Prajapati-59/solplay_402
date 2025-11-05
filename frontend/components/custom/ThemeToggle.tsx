"use client"

import * as React from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

// Simple, accessible single-button theme toggle that cycles: light -> dark -> system
// Click the button to cycle. Long press (or keyboard) shows choices via an accessible select.
export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    if (!mounted) return (
        <Button variant="outline" size="icon" aria-hidden>
            <Sun className="h-5 w-5" />
        </Button>
    )

    const currentMode = theme === "system" ? "system" : (theme || "light")
    const cycle: Array<"light" | "dark" | "system"> = ["light", "dark", "system"]
    const nextMode = () => {
        const i = cycle.indexOf(currentMode as any)
        return cycle[(i + 1) % cycle.length]
    }

    const handleClick = () => setTheme(nextMode())

    // Icon for the current mode
    const Icon = currentMode === "dark" ? Moon : currentMode === "system" ? Monitor : Sun

    // Friendly label (includes resolvedTheme so "system" is meaningful)
    const label =
        currentMode === "system"
            ? `System (currently ${resolvedTheme || "light"})`
            : currentMode.charAt(0).toUpperCase() + currentMode.slice(1)

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={handleClick}
                aria-label={`Toggle theme — ${label}. Click to cycle light, dark, system.`}
                title={`Theme: ${label} — click to change`}
                className="relative flex items-center justify-center p-2"
            >
                <Icon className="h-5 w-5 transition-transform duration-200" />
                {/* small badge to show resolved theme when system is active */}
                {currentMode === "system" && (
                    <span className="absolute -bottom-1 -right-1 min-w-[18px] px-1 py-[2px] text-[10px] rounded-md bg-muted text-muted-foreground">
                        {resolvedTheme?.slice(0, 1).toUpperCase()}
                    </span>
                )}
            </Button>

            {/* Visually-hidden select for users who prefer direct selection (keyboard / screen reader) */}
            <label className="sr-only" htmlFor="theme-select">
                Choose theme
            </label>
            <select
                id="theme-select"
                value={theme || "light"}
                onChange={(e) => setTheme(e.target.value)}
                className="sr-only"
                aria-hidden
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
            </select>
        </div>
    )
}
