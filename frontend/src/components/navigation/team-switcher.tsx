import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/hooks/use-sidebar"
import { cn } from "@/lib/utils"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
    disabled?: boolean
    accentClass?: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(
    teams.find((team) => !team.disabled) ?? teams[0]
  )
  const handleRestrictedAction = React.useCallback(() => {
    toast.error("You need admin rights to do thiss")
  }, [])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div
                className={cn(
                  "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
                  activeTeam.accentClass
                )}
              >
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeTeam.name}
                </span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Projects
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              const isDisabled = Boolean(team.disabled)

              return (
                <DropdownMenuItem
                  key={team.name}
                  aria-disabled={isDisabled}
                  onSelect={(event) => {
                    if (isDisabled) {
                      event.preventDefault()
                      handleRestrictedAction()
                      return
                    }
                    setActiveTeam(team)
                  }}
                  className={cn(
                    "gap-2 p-2",
                    isDisabled && "text-muted-foreground opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-sm border bg-background",
                      team.accentClass,
                      isDisabled && "border-dashed opacity-60"
                    )}
                  >
                    <team.logo className="size-4 shrink-0" />
                  </div>
                  <span
                    className={cn(
                      isDisabled ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {team.name}
                  </span>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              aria-disabled={true}
              onSelect={(event) => {
                event.preventDefault()
                handleRestrictedAction()
              }}
              className="gap-2 p-2 text-muted-foreground opacity-60"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background opacity-80 text-muted-foreground">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add Project</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
