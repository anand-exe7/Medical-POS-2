import { NextResponse } from "next/server";
import { listSuppliers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listSuppliers();
  return NextResponse.json(data);
}
