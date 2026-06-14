import { type NextRequest, NextResponse } from "next/server"

import type { GithubRepoCheckResponse } from "@/lib/github"
import { getGithubToken, githubApiFetch } from "@/lib/github-server"
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

  const userRes = await githubApiFetch(token, "/user")
  if (!userRes.ok) {
    return NextResponse.json({ error: "Failed to load GitHub user" }, { status: 502 })
  }
  const user = await userRes.json()

  const repoRes = await githubApiFetch(token, `/repos/${user.login}/${parsed.data.name}`)
  if (repoRes.status === 404) {
    return NextResponse.json<GithubRepoCheckResponse>({ exists: false })
  }
  if (!repoRes.ok) {
    return NextResponse.json({ error: "Failed to check repository" }, { status: 502 })
  }

  return NextResponse.json<GithubRepoCheckResponse>({ exists: true })
}
