import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

import type { GithubRepoCreateResponse } from "@/lib/github"
import { GH_REPO_COOKIE, getGithubToken, githubApiFetch, githubCookieOptions } from "@/lib/github-server"
import { githubRepoNameSchema } from "@/lib/schemas"

export async function POST(request: NextRequest) {
  const token = await getGithubToken()
  if (!token) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = githubRepoNameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid repository name" }, { status: 400 })
  }

  const createRes = await githubApiFetch(token, "/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: parsed.data.name,
      private: true,
      description: "Tick task data",
      auto_init: true,
    }),
  })

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => null)
    return NextResponse.json({ error: errorBody?.message ?? "Failed to create repository" }, { status: 502 })
  }

  const repoData = await createRes.json()
  const owner = repoData.owner.login as string
  const repo = repoData.name as string

  // Tag the repo so the app can recognize it later
  await githubApiFetch(token, `/repos/${owner}/${repo}/topics`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names: ["tick-app-data"] }),
  }).catch(() => null)

  const cookieStore = await cookies()
  cookieStore.set(GH_REPO_COOKIE, JSON.stringify({ owner, repo }), githubCookieOptions)

  return NextResponse.json<GithubRepoCreateResponse>({ owner, repo })
}
