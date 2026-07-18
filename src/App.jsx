import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./views/LandingPage";
import AdminDashboard from "./views/AdminDashboard";
import TVDisplay from "./views/TVDisplay";
import LivePage from "./views/LivePage";
import PlayerPortal from "./views/PlayerPortal";
import TournamentWizard from "./tools/TournamentWizard";

// ─────────────────────────────────────────────────────────
// Route Map:
//   /              → Public landing page (registration, cause, sponsors)
//   /live          → Public game day hub (scores, standings, fan zone)
//   /captain       → Captain OTP login + scoring portal
//   /tv            → Clubhouse projector auto-rotating display
//   /admin         → Admin dashboard (build / publish / game day)
//   /wizard        → Tournament configuration wizard (setup tool)
// ─────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<LivePage />} />

        {/* Player */}
        <Route path="/captain" element={<PlayerPortal />} />

        {/* Spectator display */}
        <Route path="/tv" element={<TVDisplay />} />

        {/* Admin (protected in production — add auth guard) */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Setup tool */}
        <Route path="/wizard" element={<TournamentWizard />} />

        {/* 404 fallback */}
        <Route
          path="*"
          element={
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", gap: 16 }}>
              <h1 style={{ fontSize: 48, fontWeight: 900, color: "#D4A843" }}>404</h1>
              <p style={{ color: "#ffffff60" }}>Page not found</p>
              <Link to="/" style={{ color: "#D4A843", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                ← Back to home
              </Link>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
