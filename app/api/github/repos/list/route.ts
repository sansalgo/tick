import { NextResponse } from "next/server"

import type { GithubListReposResponse } from "@/lib/github"
import { getGithubToken, githubApiFetch } from "@/lib/github-server"

export async function GET() {
  const token = await getGithubToken()
  if (!token) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const userRes = await githubApiFetch(token, "/user")
  if (!userRes.ok) {
    return NextResponse.json({ error: "Failed to load GitHub user" }, { status: 502 })
  }
  const user = await userRes.json()
  const login = user.login as string

  const searchRes = await githubApiFetch(
    token,
    `/search/repositories?q=user:${login}+topic:tick-app-data&per_page=100`
  )

  if (!searchRes.ok) {
    return NextResponse.json<GithubListReposResponse>({ repos: [] })
  }

  const searchData = await searchRes.json()
  const items = (searchData.items ?? []) as Array<{ name: string; owner: { login: string } }>
  const repos = items.map((item) => ({ owner: item.owner.login, repo: item.name }))

  return NextResponse.json<GithubListReposResponse>({ repos })
}
