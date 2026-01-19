"use client"

import { Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Light mode"
      className="relative h-9 w-9 cursor-not-allowed opacity-60"
      disabled
    >
      <Sun className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Light mode</span>
    </Button>
  )
}
