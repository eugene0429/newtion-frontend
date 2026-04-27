export interface FileRecord {
  _id: string;
  name: string;
  type: "attachment" | "image";
  folder_id?: string | null;
  folder_type?: string | null;
  key: string;
  checksum?: string | null;
  user_id?: string | null;
  mimetype: string;
  bucket: string;
  size: number;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
}

export interface UploadUrlResponse {
  fileId: string;
  uploadUrl: string;
  key: string;
}
