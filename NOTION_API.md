# Newtion Backend API

This document describes the current Notion-style MVP API exposed by `newtion-backend`.

Base URL for local development:

```text
http://localhost:3035
```

## Conventions

- Authentication is not applied yet.
- IDs are MongoDB `ObjectId` strings.
- Soft delete is used for workspaces, pages, blocks, and files.
- Timestamp fields are ISO date strings in responses.
- `removedAt: null` means the resource is active.

## Data Models

### Workspace

```json
{
  "_id": "ObjectId",
  "name": "Workspace name",
  "description": "Optional description",
  "icon": "Optional icon",
  "ownerUserId": "Optional user id",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "removedAt": null
}
```

### Page

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "parentPageId": "ObjectId or null",
  "title": "Page title",
  "emoji": "Optional emoji",
  "icon": "Optional icon",
  "coverUrl": "Optional cover URL",
  "order": 0,
  "isArchived": false,
  "isPublished": false,
  "properties": {},
  "creatorUserId": "Optional user id",
  "lastEditedBy": "Optional user id",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "removedAt": null
}
```

### Block

```json
{
  "_id": "ObjectId",
  "pageId": "ObjectId",
  "parentBlockId": "ObjectId or null",
  "type": "paragraph",
  "content": {},
  "order": 0,
  "createdBy": "Optional user id",
  "updatedBy": "Optional user id",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "removedAt": null
}
```

### File

```json
{
  "_id": "ObjectId",
  "name": "filename.txt",
  "type": "attachment",
  "folder_id": "Optional folder id",
  "folder_type": "Optional folder type",
  "key": "newtion/page/root/...",
  "checksum": "Optional checksum",
  "user_id": "Optional user id",
  "mimetype": "text/plain",
  "bucket": "newtion-file",
  "size": 123,
  "created_at": "ISO date",
  "updated_at": "ISO date",
  "removed_at": null
}
```

## Health

### `GET /`

Returns a simple service message.

### `GET /heartbeat`

Returns a simple service message.

### `GET /health`

Returns status and timestamp.

## Workspaces

### `GET /workspaces`

Returns active workspaces.

### `POST /workspaces`

Create a workspace.

Request:

```json
{
  "name": "My Workspace",
  "description": "Optional description",
  "icon": "N",
  "ownerUserId": "user-1"
}
```

### `GET /workspaces/:workspaceId`

Returns a single workspace.

### `PATCH /workspaces/:workspaceId`

Update any of:

```json
{
  "name": "Renamed Workspace",
  "description": "Updated description",
  "icon": "W",
  "ownerUserId": "user-2"
}
```

### `GET /workspaces/:workspaceId/sidebar`

Returns the workspace and a nested page tree for sidebar rendering.

Query params:

- `includeArchived=true` to include archived pages

Response shape:

```json
{
  "workspace": {},
  "tree": [
    {
      "_id": "ObjectId",
      "title": "Root page",
      "children": []
    }
  ],
  "flatCount": 3
}
```

### `DELETE /workspaces/:workspaceId`

Soft deletes the workspace and all pages and blocks in it.

## Pages

### `GET /pages`

List pages.

Query params:

- `workspaceId`
- `parentPageId`
- `includeArchived=true`
- `includeRemoved=true`
- `query`

Notes:

- Use `parentPageId=null` to list root pages only.
- By default archived pages are excluded.

### `GET /pages/search`

Search page titles inside a workspace.

Query params:

- `workspaceId` required
- `query` required

### `POST /pages`

Create a page.

Request:

```json
{
  "workspaceId": "workspace ObjectId",
  "parentPageId": null,
  "title": "Untitled",
  "emoji": "D",
  "icon": "P",
  "coverUrl": "https://...",
  "order": 0,
  "isPublished": false,
  "properties": {},
  "creatorUserId": "user-1",
  "lastEditedBy": "user-1"
}
```

### `GET /pages/:pageId`

Returns a single page.

### `GET /pages/:pageId/detail`

Returns page data plus all blocks for editor rendering.

Response shape:

```json
{
  "page": {},
  "blocks": [],
  "blockTree": []
}
```

### `PATCH /pages/:pageId`

Update any of:

```json
{
  "title": "Updated title",
  "emoji": "T",
  "icon": "P",
  "coverUrl": "https://...",
  "parentPageId": null,
  "workspaceId": "workspace ObjectId",
  "order": 2,
  "isArchived": false,
  "isPublished": true,
  "properties": {},
  "lastEditedBy": "user-2"
}
```

### `PATCH /pages/reorder`

Batch reorder pages and optionally move them under another parent.

Request:

```json
{
  "items": [
    {
      "pageId": "page ObjectId",
      "order": 0,
      "parentPageId": null
    }
  ]
}
```

### `POST /pages/:pageId/archive`

Archives a page.

### `POST /pages/:pageId/restore`

Restores a soft-deleted page.

### `DELETE /pages/:pageId`

Soft deletes the page, all descendant pages, and all blocks inside those pages.

## Blocks

### `GET /blocks`

List blocks.

Query params:

- `pageId`
- `parentBlockId`
- `includeRemoved=true`

Notes:

- Use `parentBlockId=null` to list only root blocks if needed.

### `GET /blocks/tree`

Returns all blocks for a page and the nested block tree.

Query params:

- `pageId` required

### `POST /blocks`

Create a single block.

Request:

```json
{
  "pageId": "page ObjectId",
  "parentBlockId": null,
  "type": "paragraph",
  "content": {
    "text": "Hello"
  },
  "order": 0,
  "createdBy": "user-1",
  "updatedBy": "user-1"
}
```

### `POST /blocks/batch`

Create multiple blocks in one request.

Request:

```json
{
  "items": [
    {
      "pageId": "page ObjectId",
      "type": "paragraph",
      "content": {
        "text": "Line 1"
      }
    }
  ]
}
```

### `GET /blocks/:blockId`

Returns a single block.

### `PATCH /blocks/:blockId`

Update any of:

```json
{
  "type": "heading_1",
  "content": {
    "text": "New title"
  },
  "order": 3,
  "parentBlockId": null,
  "updatedBy": "user-2"
}
```

### `PATCH /blocks/reorder`

Batch reorder blocks and optionally move them under another parent block.

Request:

```json
{
  "items": [
    {
      "blockId": "block ObjectId",
      "order": 0,
      "parentBlockId": null
    }
  ]
}
```

### `DELETE /blocks/:blockId`

Soft deletes the target block and all descendant blocks.

## Files

### `POST /files/upload-url`

Creates a file metadata row and returns a presigned S3 upload URL.

Request:

```json
{
  "name": "notes.txt",
  "type": "attachment",
  "folder_id": null,
  "folder_type": null,
  "checksum": null,
  "user_id": null,
  "mimetype": "text/plain",
  "size": 120
}
```

### `POST /files/:fileId/complete`

Marks upload metadata as completed and updates `size` and `checksum`.

Request:

```json
{
  "size": 120,
  "checksum": "sha256"
}
```

### `GET /files`

List files.

Query params:

- `key`
- `folder_id`
- `folder_type`
- `user_id`

Notes:

- If `key` is provided, a single file document is returned.
- Otherwise an array is returned.

### `GET /files/:fileId`

Returns a single file by id.

### `GET /files/download-url`

Returns a presigned download URL by S3 key.

Query params:

- `key` required
- `mimetype`
- `fileName`
- `bucket`

### `GET /files/:fileId/download-url`

Returns a presigned download URL using the file record.

### `DELETE /files/:fileId`

Soft deletes a file record by id.

### `DELETE /files/key`

Soft deletes a file record by key.

Query params:

- `key` required

## Suggested Frontend Flow

### Sidebar

1. `GET /workspaces`
2. `GET /workspaces/:workspaceId/sidebar`

### Open a page

1. `GET /pages/:pageId/detail`

### Create a page

1. `POST /pages`
2. Refresh sidebar with `GET /workspaces/:workspaceId/sidebar`

### Reorder pages

1. `PATCH /pages/reorder`
2. Refresh sidebar

### Edit blocks

1. `GET /pages/:pageId/detail`
2. `POST /blocks`, `PATCH /blocks/:blockId`, `PATCH /blocks/reorder`, `DELETE /blocks/:blockId`

### Upload attachments

1. `POST /files/upload-url`
2. `PUT` file bytes to returned `uploadUrl`
3. `POST /files/:fileId/complete`
4. Use returned `key` for later file lookup
