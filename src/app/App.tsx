import { Navigate, Route, Routes } from "react-router-dom";
import { useAppState } from "./state";
import { homePathForRole } from "./roles";
import { Login } from "./Login";
import { Shell } from "./Shell";
import { Placeholder } from "./Placeholder";
import { Contacts } from "../screens/contacts/Contacts";

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
      <Route element={<Shell />}>
        {/* Screens are built one per step from their fragments. */}
        <Route path="/welcome" element={<Placeholder name="Welcome" />} />
        <Route path="/intelligence" element={<Placeholder name="Intelligence" />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<Placeholder name="Contact Detail" />} />
        <Route path="/opportunities" element={<Placeholder name="Opportunities" />} />
        <Route path="/inbox" element={<Placeholder name="Inbox" />} />
        <Route path="/marketing" element={<Placeholder name="Marketing" />} />
        <Route path="/reports" element={<Placeholder name="Reports" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
        <Route path="/transactions" element={<Placeholder name="Transactions" />} />
        <Route path="/activities" element={<Placeholder name="Activities" />} />
        <Route path="/partner/dashboard" element={<Placeholder name="Partner Dashboard" />} />
        <Route path="/partner/pipeline" element={<Placeholder name="Partner Pipeline" />} />
        <Route path="/partner/new-referral" element={<Placeholder name="New Referral" />} />
        <Route path="/partner/collaterals" element={<Placeholder name="Collaterals" />} />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
