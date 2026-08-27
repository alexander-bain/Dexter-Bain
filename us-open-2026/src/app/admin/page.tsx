import { AdminConsole } from "@/components/AdminConsole";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return <div className="page-shell listing-page"><div className="listing-head"><div><div className="eyebrow"><span /> Protected operations</div><h1>Match desk.</h1><p>Import draw data, record official results, and recalculate public standings.</p></div></div><AdminConsole /></div>;
}
