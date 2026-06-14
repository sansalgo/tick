import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

import {
  GH_OAUTH_STATE_COOKIE,
  GH_TOKEN_COOKIE,
  GITHUB_OAUTH_TOKEN_URL,
  githubCookieOptions,
} from "@/lib/github-server"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_BASE_URL ?? request.nextUrl.origin
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(GH_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(GH_OAUTH_STATE_COOKIE)

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?gh_error=invalid_state", baseUrl))
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const redirectUri = process.env.GITHUB_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/?gh_error=not_configured", baseUrl))
  }

  const tokenRes = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenBody = await tokenRes.json().catch(() => null)
  const accessToken = tokenBody?.access_token

  if (!tokenRes.ok || typeof accessToken !== "string") {
    return NextResponse.redirect(new URL("/?gh_error=token_exchange_failed", baseUrl))
  }

  cookieStore.set(GH_TOKEN_COOKIE, accessToken, githubCookieOptions)

  return NextResponse.redirect(new URL("/?gh_connected=1", baseUrl))
}
