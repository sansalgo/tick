import { type NextRequest, NextResponse } from "next/server"

import { GITHUB_DATA_PATH } from "@/lib/constants"
import type { GitPushConflictBody, GitPushResponse } from "@/lib/github"
import { getGithubRepoCookie, getGithubToken, githubApiFetch } from "@/lib/github-server"
import { appDataSchema, type AppData } from "@/lib/schemas"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveHead(token: string, owner: string, repo: string): Promise<{ commitSha: string; treeSha: string }> {
  const refRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/refs/heads/main`)
  if (!refRes.ok) throw new Error(`Failed to resolve HEAD (${refRes.status})`)
  const refData = await refRes.json()
  const refObject = Array.isArray(refData) ? refData[0] : refData
  const commitSha: string = refObject?.object?.sha
  if (!commitSha) throw new Error("HEAD commit SHA not found")

  const commitRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/commits/${commitSha}`)
  if (!commitRes.ok) throw new Error("Failed to read HEAD commit")
  const commitData = await commitRes.json()
  return { commitSha, treeSha: commitData.tree.sha as string }
}

async function fetchDataAtTree(token: string, owner: string, repo: string, treeSha: string): Promise<AppData | null> {
  const treeRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/trees/${treeSha}`)
  if (!treeRes.ok) return null
  const treeData = await treeRes.json()
  const entry = (treeData.tree as Array<{ path: string; sha: string; type: string }>).find(
    (e) => e.path === GITHUB_DATA_PATH && e.type === "blob"
  )
  if (!entry) return null

  const blobRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/blobs/${entry.sha}`)
  if (!blobRes.ok) return null
  const blobData = await blobRes.json()
  try {
    const content = Buffer.from(blobData.content as string, "base64").toString("utf-8")
    const parsed = appDataSchema.safeParse(JSON.parse(content))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

async function conflictResponse(token: string, owner: string, repo: string): Promise<Response> {
  try {
    const head = await resolveHead(token, owner, repo)
    const remoteData = await fetchDataAtTree(token, owner, repo, head.treeSha)
    return NextResponse.json<GitPushConflictBody>(
      { conflict: true, remoteCommitSha: head.commitSha, remoteData },
      { status: 409 }
    )
  } catch {
    return NextResponse.json({ error: "Conflict detected but failed to fetch remote state" }, { status: 409 })
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = await getGithubToken()
  const repoInfo = await getGithubRepoCookie()
  if (!token || !repoInfo) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const dataParsed = appDataSchema.safeParse(body?.data)
  if (!dataParsed.success) {
    return NextResponse.json({ error: "Invalid data payload" }, { status: 400 })
  }

  const { owner, repo } = repoInfo
  const parentSha: string | null = typeof body?.parentSha === "string" ? body.parentSha : null
  const message: string =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim()
      : new Date().toISOString()

  try {
    // Step 1: Resolve current HEAD
    const { commitSha: headCommitSha, treeSha: currentTreeSha } = await resolveHead(token, owner, repo)

    // Step 2: Conflict check — parentSha must match HEAD (skip check if null = first push)
    if (parentSha !== null && parentSha !== headCommitSha) {
      return conflictResponse(token, owner, repo)
    }

    // Step 3: Create blob from data
    const fileContent = Buffer.from(JSON.stringify(dataParsed.data, null, 2)).toString("base64")
    const blobRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileContent, encoding: "base64" }),
    })
    if (!blobRes.ok) throw new Error("Failed to create blob")
    const { sha: blobSha } = await blobRes.json()

    // Step 4: Create tree extending the current one
    const treeRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: currentTreeSha,
        tree: [{ path: GITHUB_DATA_PATH, mode: "100644", type: "blob", sha: blobSha }],
      }),
    })
    if (!treeRes.ok) throw new Error("Failed to create tree")
    const { sha: newTreeSha } = await treeRes.json()

    // Step 5: Create commit
    const commitRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tree: newTreeSha,
        parents: [headCommitSha],
      }),
    })
    if (!commitRes.ok) throw new Error("Failed to create commit")
    const { sha: newCommitSha } = await commitRes.json()

    // Step 6: Advance HEAD (non-force fast-forward)
    const refRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/refs/heads/main`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommitSha, force: false }),
    })

    if (!refRes.ok) {
      // Race condition: someone pushed between our HEAD check and PATCH
      return conflictResponse(token, owner, repo)
    }

    return NextResponse.json<GitPushResponse>({ commitSha: newCommitSha })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Push failed" },
      { status: 502 }
    )
  }
}
