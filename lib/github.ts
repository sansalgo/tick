import type { AppData } from "@/lib/schemas"

// ─── Response types ───────────────────────────────────────────────────────────

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

export interface GithubRepoInfo {
  owner: string
  repo: string
}

export interface GithubListReposResponse {
  repos: GithubRepoInfo[]
}

export type GitFetchResponse =
  | { exists: true; commitSha: string; data: AppData }
  | { exists: false; commitSha: string | null }

export interface GitPushResponse {
  commitSha: string
}

export interface GitPushConflictBody {
  conflict: true
  remoteCommitSha: string
  remoteData: AppData | null
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class GitConflictError extends Error {
  readonly remoteCommitSha: string
  readonly remoteData: AppData | null

  constructor(remoteCommitSha: string, remoteData: AppData | null) {
    super("Push rejected: remote has diverged")
    this.name = "GitConflictError"
    this.remoteCommitSha = remoteCommitSha
    this.remoteData = remoteData
  }
}

// ─── Base request helper ──────────────────────────────────────────────────────

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

// ─── Auth / repo management ───────────────────────────────────────────────────

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

export function listGithubRepos() {
  return request<GithubListReposResponse>("/api/github/repos/list")
}

export function selectGithubRepo(owner: string, repo: string) {
  return request<GithubRepoCreateResponse>("/api/github/repos/select", {
    method: "POST",
    body: JSON.stringify({ owner, repo }),
  })
}

export function logoutGithub() {
  return request<{ ok: true }>("/api/github/logout")
}

// ─── Git operations ───────────────────────────────────────────────────────────

export function gitFetch(): Promise<GitFetchResponse> {
  return request<GitFetchResponse>("/api/github/git/fetch")
}

export async function gitPush(
  data: AppData,
  message: string,
  parentSha: string | null
): Promise<GitPushResponse> {
  const res = await fetch("/api/github/git/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, message, parentSha }),
  })

  if (res.status === 409) {
    const body: GitPushConflictBody = await res.json().catch(() => ({
      conflict: true,
      remoteCommitSha: "",
      remoteData: null,
    }))
    throw new GitConflictError(body.remoteCommitSha, body.remoteData)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${res.status}`)
  }

  return res.json() as Promise<GitPushResponse>
}
