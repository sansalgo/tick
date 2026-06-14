import type { AppData } from "@/lib/schemas"

export interface GithubStatusResponse {
  connected: boolean
  login: string | null
  owner: string | null
  repo: string | null
}

export interface GithubRepoCheckResponse {
  exists: boolean
}

export interface GithubRepoCreateResponse {
  owner: string
  repo: string
}

export interface GithubSyncGetResponse {
  exists: boolean
  data?: AppData
  sha?: string
}

export interface GithubSyncPutResponse {
  sha: string
  updatedAt: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getGithubStatus() {
  return request<GithubStatusResponse>("/api/github/status")
}

export function checkGithubRepo(name: string) {
  return request<GithubRepoCheckResponse>("/api/github/repos/check", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function createGithubRepo(name: string) {
  return request<GithubRepoCreateResponse>("/api/github/repos/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function getGithubSync() {
  return request<GithubSyncGetResponse>("/api/github/sync")
}

export function putGithubSync(data: AppData, sha?: string | null) {
  return request<GithubSyncPutResponse>("/api/github/sync", {
    method: "PUT",
    body: JSON.stringify({ data, sha }),
  })
}

export function logoutGithub() {
  return request<{ ok: true }>("/api/github/logout")
}
