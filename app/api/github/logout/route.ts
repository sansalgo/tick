import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { GH_REPO_COOKIE, GH_TOKEN_COOKIE } from "@/lib/github-server"

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete(GH_TOKEN_COOKIE)
  cookieStore.delete(GH_REPO_COOKIE)
  return NextResponse.json({ ok: true })
}
