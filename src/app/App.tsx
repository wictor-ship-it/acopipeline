import { Navigate, Route, Routes } from "react-router-dom";
import { useAppState } from "./state";
import { AppShell } from "./AppShell";
import { Login } from "../screens/login/Login";
import { Welcome } from "../screens/welcome/Welcome";
import { Intelligence } from "../screens/intelligence/Intelligence";
import { Contacts } from "../screens/contacts/Contacts";
import { Placeholder } from "../screens/Placeholder";
import { homePathForRole } from "./roles";

export function App() {
  const { authed, viewAs } = useAppState();

  if (!authed) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const home = homePathForRole(viewAs);

  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Internal screens (README §6) */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/intelligence" element={<Intelligence />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route
          path="/opportunities"
          element={<Placeholder name="Opportunities" />}
        />
        <Route path="/inbox" element={<Placeholder name="Inbox" />} />
        <Route path="/marketing" element={<Placeholder name="Marketing" />} />
        <Route path="/reports" element={<Placeholder name="Reports" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
        <Route path="/activities" element={<Placeholder name="Activities" />} />

        {/* Partner portal (README §6) */}
        <Route
          path="/partner/dashboard"
          element={<Placeholder name="Partner Dashboard" />}
        />
        <Route
          path="/partner/pipeline"
          element={<Placeholder name="Partner Pipeline" />}
        />
        <Route
          path="/partner/new-referral"
          element={<Placeholder name="New Referral" />}
        />
        <Route
          path="/partner/collaterals"
          element={<Placeholder name="Collaterals" />}
        />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
