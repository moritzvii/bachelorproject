import "./styles/tailwind.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { router } from "@/router/routes"

import { AuthProvider } from "@/features/auth/auth-context"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
            <TooltipProvider delayDuration={0}>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
                <Toaster richColors />
            </TooltipProvider>
    </StrictMode>
)
