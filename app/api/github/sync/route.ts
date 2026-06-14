import { type NextRequest, NextResponse } from "next/server"

import { GITHUB_DATA_PATH } from "@/lib/constants"
import type { GithubSyncGetResponse, GithubSyncPutResponse } from "@/lib/github"
import { getGithubRepoCookie, getGithubToken, githubApiFetch } from "@/lib/github-server"
import { appDataSchema } from "@/lib/schemas"

export async function GET() {
  const token = await getGithubToken()
  const repoInfo = await getGithubRepoCookie()
  if (!token || !repoInfo) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const res = await githubApiFetch(token, `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${GITHUB_DATA_PATH}`)

  if (res.status === 404) {
    return NextResponse.json<GithubSyncGetResponse>({ exists: false })
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to read data from GitHub" }, { status: 502 })
  }

  const body = await res.json()
  const content = Buffer.from(body.content, "base64").toString("utf-8")
  const parsed = appDataSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    return NextResponse.json({ error: "Stored data file is invalid" }, { status: 502 })
  }

  return NextResponse.json<GithubSyncGetResponse>({ exists: true, data: parsed.data, sha: body.sha })
}

export async function PUT(request: NextRequest) {
  const token = await getGithubToken()
  const repoInfo = await getGithubRepoCookie()
  if (!token || !repoInfo) {
    return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const dataParsed = appDataSchema.safeParse(body?.data)
  if (!dataParsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }
  const sha = typeof body?.sha === "string" ? body.sha : undefined

  const content = Buffer.from(JSON.stringify(dataParsed.data, null, 2)).toString("base64")
  const res = await githubApiFetch(token, `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${GITHUB_DATA_PATH}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update Tick data",
      content,
      ...(sha ? { sha } : {}),
    }),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    return NextResponse.json({ error: errorBody?.message ?? "Failed to write data to GitHub" }, { status: 502 })
  }

  const resBody = await res.json()

  return NextResponse.json<GithubSyncPutResponse>({
    sha: resBody.content.sha,
    updatedAt: new Date().toISOString(),
  })
}
