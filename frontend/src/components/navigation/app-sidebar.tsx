import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { House, Play } from "lucide-react"
import { logout as apiLogout } from "@/lib/api"

const TeamLogos = {
  Apple: () => (
    <svg
      viewBox="0 0 256 315"
      className="h-5 w-5 text-white"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M213.803 167.511c-.348-35.119 28.695-51.819 29.975-52.607-16.349-23.874-41.768-27.17-50.74-27.549-21.607-2.179-42.115 12.805-53.083 12.805-10.693 0-27.072-12.506-44.521-12.17-22.902.335-44.053 13.292-55.89 33.67-23.781 41.221-6.06 102.551 17.056 136.174 11.323 16.37 24.84 34.712 42.608 34.038 16.957-.673 23.352-10.942 43.876-10.942 20.257 0 26.236 10.942 44.5 10.587 18.41-.312 30.013-16.45 41.24-32.878 13.017-18.97 18.41-37.452 18.713-38.41-.407-.077-36.096-13.872-36.453-54.718zm-34.177-99.854c9.292-11.257 15.587-26.927 13.854-42.588-13.394.541-29.595 8.918-39.155 20.175-8.606 9.845-16.128 25.492-14.133 40.563 14.959 1.162 30.096-7.615 39.434-18.15z"
      />
    </svg>
  ),
  Microsoft: () => (
    <img src="/microsoft.svg" alt="Microsoft" className="h-4 w-4" />
  ),
}
import { toast } from "sonner"

import { NavMain } from "@/components/navigation/nav-main"
import { NavUser } from "@/components/navigation/nav-user"
import { TeamSwitcher } from "@/components/navigation/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/auth-context"

const data = {
  user: {
    name: "Testbenutzer Lehstuhl für Wirtschaftsinformatik und Digitale Transformation",
    email: "https://www.uni-potsdam.de/de/digicat/",
    avatar: "/universitaet-potsdam-logo.png",
  },
  teams: [
    {
      name: "Apple Inc.",
      logo: TeamLogos.Apple,
      plan: "Enterprise",
      accentClass: "bg-black text-white",
    },
    {
      name: "Microsoft",
      logo: TeamLogos.Microsoft,
      plan: "Unavailable",
      disabled: true,
      accentClass: "bg-muted text-muted-foreground",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: House,
    },
    {
      title: "Start Workflow",
      url: "/introduction",
      icon: Play,
      isActive: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()
  const completeLocalLogout = useCallback(() => {
    logout()
    navigate("/login", { replace: true })
  }, [logout, navigate])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      await apiLogout()
      toast.success("Signed out successfully.")
      completeLocalLogout()
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Network error while contacting the API."
      const isNotFound = detail.includes("API error 404")
      const message = isNotFound
        ? "Signed out locally. API logout endpoint not available."
        : `${detail} Signed out locally.`
      toast[isNotFound ? "info" : "warning"](message)
      completeLocalLogout()
    } finally {
      setIsLoggingOut(false)
    }
  }, [completeLocalLogout, isLoggingOut])

  return (
    <Sidebar
      collapsible="icon"
      className="lg:bottom-0"
      {...props}
    >
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
