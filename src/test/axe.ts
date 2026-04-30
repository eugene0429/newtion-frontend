import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";
import type { AxeMatchers } from "vitest-axe/matchers";

// vitest-axe@0.1.0 augments Vi.Assertion but vitest 1.6 uses Chai.Assertion.
// Bridge the gap with a local Chai namespace augmentation.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Chai {
    interface Assertion extends AxeMatchers {}
  }
}

expect.extend(matchers);
