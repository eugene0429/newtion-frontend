import { workspacesHandlers } from "./workspaces";
import { pagesHandlers } from "./pages";
import { blocksHandlers } from "./blocks";
import { filesHandlers } from "./files";

export const handlers = [
  ...workspacesHandlers,
  ...pagesHandlers,
  ...blocksHandlers,
  ...filesHandlers,
];
