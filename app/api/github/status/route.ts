import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import type { GithubStatusResponse } from "@/lib/github"
import {
  GH_REPO_COOKIE,
  GH_TOKEN_COOKIE,
  getGithubRepoCookie,
  getGithubToken,
  githubApiFetch,
} from "@/lib/github-server"

export async function GET() {
  const token = await getGithubToken()

  if (!token) {
    return NextResponse.json<GithubStatusResponse>({
      connected: false,
      login: null,
      owner: null,
      repo: null,
    })
  }

  const userRes = await githubApiFetch(token, "/user")

  if (!userRes.ok) {
    const cookieStore = await cookies()
    cookieStore.delete(GH_TOKEN_COOKIE)
    cookieStore.delete(GH_REPO_COOKIE)
    return NextResponse.json<GithubStatusResponse>({
      connected: false,
      login: null,
      owner: null,
      repo: null,
    })
  }

  const user = await userRes.json()
  const repoInfo = await getGithubRepoCookie()

  return NextResponse.json<GithubStatusResponse>({
    connected: true,
    login: user.login,
    owner: repoInfo?.owner ?? null,
    repo: repoInfo?.repo ?? null,
  })
}
