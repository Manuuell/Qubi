import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPages } from "@/server/services/page";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchPages(user.id, q);
  return NextResponse.json(results);
}
