import { importOfficialDraw } from "@/lib/admin/importDraw";
import { requireAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  try {
    const result = await importOfficialDraw(admin.service);
    await admin.service.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "draw.import", details: result });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 500 });
  }
}
