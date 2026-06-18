import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

import type { GithubRepoCreateResponse } from "@/lib/github"
import { GH_REPO_COOKIE, getGithubToken, githubApiFetch, githubCookieOptions } from "@/lib/github-server"

export async function POST(request: NextRequest) {
  const token = await getGithubToken()
  if (!token) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.owner !== "string" || typeof body.repo !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { owner, repo } = body as { owner: string; repo: string }

  const repoRes = await githubApiFetch(token, `/repos/${owner}/${repo}`)
  if (!repoRes.ok) {
    return NextResponse.json({ error: "Repository not found or not accessible" }, { status: 404 })
  }

  const cookieStore = await cookies()
  cookieStore.set(GH_REPO_COOKIE, JSON.stringify({ owner, repo }), githubCookieOptions)

  return NextResponse.json<GithubRepoCreateResponse>({ owner, repo })
}
