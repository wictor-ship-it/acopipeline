import { Navigate, Route, Routes } from "react-router-dom";
import { useAppState } from "./state";
import { homePathForRole } from "./roles";
import { Login } from "./Login";
import { Shell } from "./Shell";
import { Placeholder } from "./Placeholder";
import { Contacts } from "../screens/contacts/Contacts";
import { Command } from "../screens/command/Command";
import { Opportunities } from "../screens/opportunities/Opportunities";
import { Transactions } from "../screens/transactions/Transactions";
import { ContactDetail } from "../screens/contact/ContactDetail";
import { Inbox } from "../screens/inbox/Inbox";
import { Intelligence } from "../screens/intelligence/Intelligence";
import { Reports } from "../screens/reports/Reports";
import { Marketing } from "../screens/marketing/Marketing";
import { Settings } from "../screens/settings/Settings";
import { DealDetail } from "../screens/deal/DealDetail";
import { PartnerDashboard } from "../screens/partner/PartnerDashboard";
import { PartnerPortal } from "../screens/partner/PartnerPortal";
import { PartnerNewReferral } from "../screens/partner/PartnerNewReferral";
import { PartnerCollaterals } from "../screens/partner/PartnerCollaterals";

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
        <Route path="/welcome" element={<Command />} />
        <Route path="/intelligence" element={<Intelligence />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/deal/:id" element={<DealDetail />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/activities" element={<Placeholder name="Activities" />} />
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="/partner/pipeline" element={<PartnerPortal />} />
        <Route path="/partner/new-referral" element={<PartnerNewReferral />} />
        <Route path="/partner/collaterals" element={<PartnerCollaterals />} />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
