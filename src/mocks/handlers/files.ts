import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { FileRecord } from "@/types/file";

export const filesHandlers = [
  http.post("*/files/upload-url", async ({ request }) => {
    const body = (await request.json()) as Partial<FileRecord>;
    const fileId = newId("file");
    const key = `newtion/mock/${fileId}/${body.name ?? "file"}`;
    const file: FileRecord = {
      _id: fileId,
      name: body.name ?? "file",
      type: (body.type as "attachment" | "image") ?? "attachment",
      key,
      mimetype: body.mimetype ?? "application/octet-stream",
      bucket: "newtion-file",
      size: body.size ?? 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      removed_at: null,
    };
    db.files.push(file);
    return HttpResponse.json({
      fileId,
      uploadUrl: `https://mock-s3.local/${key}`,
      key,
    });
  }),

  http.post("*/files/:fileId/complete", async ({ params, request }) => {
    const body = (await request.json()) as { size: number; checksum?: string };
    const f = db.files.find((x) => x._id === params.fileId);
    if (!f) return HttpResponse.json({ message: "not found" }, { status: 404 });
    f.size = body.size;
    f.checksum = body.checksum ?? null;
    f.updated_at = nowIso();
    return HttpResponse.json(f);
  }),

  http.get("*/files/:fileId/download-url", ({ params }) => {
    const f = db.files.find((x) => x._id === params.fileId);
    if (!f) return HttpResponse.json({ message: "not found" }, { status: 404 });
    return HttpResponse.json({ url: `https://mock-s3.local/${f.key}` });
  }),
];
