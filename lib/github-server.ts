import { cookies } from "next/headers"

export const GITHUB_API_URL = "https://api.github.com"
export const GITHUB_OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
export const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token"

export const GH_TOKEN_COOKIE = "gh_token"
export const GH_REPO_COOKIE = "gh_repo"
export const GH_OAUTH_STATE_COOKIE = "gh_oauth_state"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const githubCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
}

export interface GithubRepoCookie {
  owner: string
  repo: string
}

export async function getGithubToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(GH_TOKEN_COOKIE)?.value ?? null
}

export async function getGithubRepoCookie(): Promise<GithubRepoCookie | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(GH_REPO_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.owner === "string" && typeof parsed?.repo === "string") {
      return { owner: parsed.owner, repo: parsed.repo }
    }
    return null
  } catch {
    return null
  }
}

export function githubApiFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GITHUB_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  })
}
