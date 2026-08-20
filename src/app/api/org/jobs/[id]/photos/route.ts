/**
 * POST /api/org/jobs/:id/photos — Upload before/after photos
 * GET  /api/org/jobs/:id/photos — List photos with signed URLs
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { uploadPhoto, storageKey, getSignedUrls } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify job exists in this org
  const job = await t.findFirst("job", { where: { id: jobId }, select: { id: true } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const type = formData.get("type") as string;
  if (type !== "before" && type !== "after") {
    return NextResponse.json({ error: "type must be 'before' or 'after'" }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = storageKey(user.orgId, jobId, type, file.name);
    const { error } = await uploadPhoto(key, buffer, file.type);
    if (error) {
      results.push({ filename: file.name, error });
      continue;
    }
    const photo = await t.create("photo", {
      data: {
        jobId,
        type: type.toUpperCase(),
        storageKey: key,
        takenById: user.id,
      },
    });
    results.push({ filename: file.name, photoId: (photo as { id: string }).id });
  }

  return NextResponse.json({ photos: results });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const photos = await t.findMany<{
    id: string;
    type: string;
    storageKey: string;
    takenAt: string;
  }>("photo", {
    where: { jobId },
    orderBy: { takenAt: "asc" },
  });

  // Get signed URLs for all photos
  const keys = photos.map((p) => p.storageKey);
  const urls = await getSignedUrls(keys);

  const result = photos.map((p) => ({
    id: p.id,
    type: p.type,
    url: urls[p.storageKey] ?? null,
    takenAt: p.takenAt,
  }));

  return NextResponse.json({ photos: result });
}
