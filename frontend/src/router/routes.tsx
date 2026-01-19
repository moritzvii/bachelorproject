import { createBrowserRouter } from "react-router-dom";

import StrategicPlanPage from "@/pages/strategic-plan";
import LoginPage from "@/pages/login";
import EvidenceReasoningPage from "@/pages/evidence-reasoning";
import EvidenceSelectionLoadingPage from "@/pages/evidence-selection-loading";
import EvidencePositioningLoadingPage from "@/pages/evidence-positioning-loading";
import EvidenceSelectionPage from "@/pages/evidence-selection";
import RecommendationDashboardPage from "@/pages/recommendation-dashboard";
import LandingPage from "@/pages/landing";
import EvidencePositioningPage from "@/pages/evidence-positioning";


import { ProtectedRoute } from "@/features/auth/protected-route";
import IntroductionPage from "@/pages/introduction";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <LoginPage />,
    },

    {
        element: <ProtectedRoute />,
        children: [
            { path: "/", element: <LandingPage /> },
            { path: "/strategic-plan", element: <StrategicPlanPage /> },
            { path: "/reasoning", element: <EvidenceReasoningPage /> },
            { path: "/loading/1", element: <EvidenceSelectionLoadingPage /> },
            { path: "/loading/2", element: <EvidencePositioningLoadingPage /> },
            { path: "/selection", element: <EvidenceSelectionPage /> },
            { path: "/dashboard", element: <RecommendationDashboardPage /> },
            { path: "/positioning", element: <EvidencePositioningPage /> },
            { path: "/introduction", element: <IntroductionPage /> },
            {}

        ],
    },
]);
