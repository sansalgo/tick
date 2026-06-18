import { NextResponse } from "next/server"

import { GITHUB_DATA_PATH } from "@/lib/constants"
import type { GitFetchResponse } from "@/lib/github"
import { getGithubRepoCookie, getGithubToken, githubApiFetch } from "@/lib/github-server"
import { appDataSchema } from "@/lib/schemas"

export async function GET() {
  const token = await getGithubToken()
  const repoInfo = await getGithubRepoCookie()
  if (!token || !repoInfo) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const { owner, repo } = repoInfo

  // 1. Resolve HEAD commit SHA
  const refRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/refs/heads/main`)
  if (!refRes.ok) {
    if (refRes.status === 404) {
      return NextResponse.json<GitFetchResponse>({ exists: false, commitSha: null })
    }
    return NextResponse.json({ error: "Failed to read repository HEAD" }, { status: 502 })
  }
  const refData = await refRes.json()
  // GitHub may return a single object or an array for prefix matches
  const refObject = Array.isArray(refData) ? refData[0] : refData
  const headCommitSha: string = refObject?.object?.sha
  if (!headCommitSha) {
    return NextResponse.json({ error: "Could not resolve HEAD commit" }, { status: 502 })
  }

  // 2. Get tree SHA from HEAD commit
  const commitRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/commits/${headCommitSha}`)
  if (!commitRes.ok) {
    return NextResponse.json({ error: "Failed to read HEAD commit" }, { status: 502 })
  }
  const commitData = await commitRes.json()
  const treeSha: string = commitData.tree.sha

  // 3. Find tick-data.json blob in root tree
  const treeRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/trees/${treeSha}`)
  if (!treeRes.ok) {
    return NextResponse.json({ error: "Failed to read repository tree" }, { status: 502 })
  }
  const treeData = await treeRes.json()
  const blobEntry = (treeData.tree as Array<{ path: string; sha: string; type: string }>).find(
    (entry) => entry.path === GITHUB_DATA_PATH && entry.type === "blob"
  )

  if (!blobEntry) {
    return NextResponse.json<GitFetchResponse>({ exists: false, commitSha: headCommitSha })
  }

  // 4. Fetch blob content
  const blobRes = await githubApiFetch(token, `/repos/${owner}/${repo}/git/blobs/${blobEntry.sha}`)
  if (!blobRes.ok) {
    return NextResponse.json({ error: "Failed to read data file" }, { status: 502 })
  }
  const blobData = await blobRes.json()

  let parsed
  try {
    const content = Buffer.from(blobData.content as string, "base64").toString("utf-8")
    parsed = appDataSchema.safeParse(JSON.parse(content))
  } catch {
    return NextResponse.json({ error: "Data file is corrupted or unreadable" }, { status: 502 })
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Data file failed schema validation" }, { status: 502 })
  }

  return NextResponse.json<GitFetchResponse>({ exists: true, commitSha: headCommitSha, data: parsed.data })
}
