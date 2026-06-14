import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { GH_OAUTH_STATE_COOKIE, GITHUB_OAUTH_AUTHORIZE_URL, githubCookieOptions } from "@/lib/github-server"

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI." },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(GH_OAUTH_STATE_COOKIE, state, { ...githubCookieOptions, maxAge: 600 })

  const authorizeUrl = new URL(GITHUB_OAUTH_AUTHORIZE_URL)
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("scope", "repo")
  authorizeUrl.searchParams.set("state", state)

  return NextResponse.redirect(authorizeUrl)
}
