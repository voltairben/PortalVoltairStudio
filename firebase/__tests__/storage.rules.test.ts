import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadString } from "firebase/storage";
import { beforeEach, describe, it } from "vitest";
import { CLIENT_A, CLIENT_B, USER_A, adminCtx, anonCtx, clientCtx, seedStorage, st } from "./helpers";

beforeEach(async () => {
  await seedStorage(async (storage) => {
    await uploadString(ref(storage, `clients/${CLIENT_A}/brief.pdf`), "alpha brief");
    await uploadString(ref(storage, `clients/${CLIENT_B}/brief.pdf`), "beta brief");
  });
});

describe("storage — tenant isolation", () => {
  it("client A reads files in its own folder", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getBytes(ref(storage, `clients/${CLIENT_A}/brief.pdf`)));
  });

  it("client A cannot read client B's folder", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(getBytes(ref(storage, `clients/${CLIENT_B}/brief.pdf`)));
  });

  it("client A cannot write files (upload is admin-only)", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(uploadString(ref(storage, `clients/${CLIENT_A}/upload.txt`), "nope"));
  });

  it("unauthenticated access is denied", async () => {
    const storage = st(anonCtx());
    await assertFails(getBytes(ref(storage, `clients/${CLIENT_A}/brief.pdf`)));
  });
});

describe("storage — admin", () => {
  it("reads and writes across any tenant folder", async () => {
    const storage = st(adminCtx());
    await assertSucceeds(getBytes(ref(storage, `clients/${CLIENT_B}/brief.pdf`)));
    await assertSucceeds(uploadString(ref(storage, `clients/${CLIENT_B}/v2.mp4`), "admin upload"));
  });
});
