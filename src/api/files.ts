import { api } from "./client";
import type { FileRecord, UploadUrlResponse } from "@/types/file";

export interface CreateUploadUrlInput {
  name: string;
  type: "attachment" | "image";
  mimetype: string;
  size: number;
  folder_id?: string | null;
  folder_type?: string | null;
  user_id?: string | null;
  checksum?: string | null;
}

export async function createUploadUrl(
  input: CreateUploadUrlInput,
): Promise<UploadUrlResponse> {
  const { data } = await api.post<UploadUrlResponse>(
    "/files/upload-url",
    input,
  );
  return data;
}

export async function completeUpload(
  fileId: string,
  body: { size: number; checksum?: string },
): Promise<FileRecord> {
  const { data } = await api.post<FileRecord>(
    `/files/${fileId}/complete`,
    body,
  );
  return data;
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    `/files/${fileId}/download-url`,
  );
  return data.url;
}
