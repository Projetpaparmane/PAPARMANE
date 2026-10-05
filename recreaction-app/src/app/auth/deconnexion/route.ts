import { type NextRequest, NextResponse } from "next/server";
import { createSessionSupabase } from "@/lib/supabase/clients";

export async function POST(request: NextRequest) {
  const supabase = await createSessionSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
