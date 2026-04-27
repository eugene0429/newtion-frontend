import type { BlockInput } from "./blockAdapter";

export interface BlockDelta {
  toCreate: BlockInput[];
  toUpdate: BlockInput[];
  toDelete: string[];
}

function isSame(a: BlockInput, b: BlockInput): boolean {
  return (
    a.type === b.type &&
    a.order === b.order &&
    a.parentBlockId === b.parentBlockId &&
    JSON.stringify(a.content) === JSON.stringify(b.content)
  );
}

export function computeBlockDelta(
  previous: BlockInput[],
  next: BlockInput[],
): BlockDelta {
  const prevById = new Map(previous.map((b) => [b._id, b]));
  const nextById = new Map(next.map((b) => [b._id, b]));

  const toCreate: BlockInput[] = [];
  const toUpdate: BlockInput[] = [];
  const toDelete: string[] = [];

  next.forEach((b) => {
    const before = prevById.get(b._id);
    if (!before) toCreate.push(b);
    else if (!isSame(before, b)) toUpdate.push(b);
  });

  prevById.forEach((_b, id) => {
    if (!nextById.has(id)) toDelete.push(id);
  });

  return { toCreate, toUpdate, toDelete };
}
