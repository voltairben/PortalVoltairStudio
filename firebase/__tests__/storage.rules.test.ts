import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadString } from "firebase/storage";
import { beforeEach, describe, it } from "vitest";
import {
  CLIENT_A,
  CLIENT_B,
  USER_A,
  USER_B,
  adminCtx,
  anonCtx,
  clientCtx,
  seedStorage,
  st,
} from "./helpers";

beforeEach(async () => {
  await seedStorage(async (storage) => {
    await uploadString(ref(storage, `deliverables/${CLIENT_A}/cut-01.mp4`), "alpha cut");
    await uploadString(ref(storage, `deliverables/${CLIENT_B}/cut-01.mp4`), "beta cut");
    await uploadString(ref(storage, `attachments/${CLIENT_B}/ref.png`), "beta attachment");
  });
});

describe("storage — deliverable files (studio uploads, tenant reads)", () => {
  it("client A reads its own deliverable file", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getBytes(ref(storage, `deliverables/${CLIENT_A}/cut-01.mp4`)));
  });

  it("client A cannot read client B's deliverable file", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(getBytes(ref(storage, `deliverables/${CLIENT_B}/cut-01.mp4`)));
  });

  it("client A cannot upload a deliverable file (admin only)", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(uploadString(ref(storage, `deliverables/${CLIENT_A}/hack.mp4`), "nope"));
  });

  it("unauthenticated access is denied", async () => {
    const storage = st(anonCtx());
    await assertFails(getBytes(ref(storage, `deliverables/${CLIENT_A}/cut-01.mp4`)));
  });
});

describe("storage — feedback attachments (tenant reads + writes)", () => {
  it("client A uploads an image attachment into its own tenant folder", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(
      uploadString(ref(storage, `attachments/${CLIENT_A}/note.png`), "my ref", "raw", {
        contentType: "image/png",
      }),
    );
  });

  it("client A cannot upload a non-media attachment (contentType guard)", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      uploadString(ref(storage, `attachments/${CLIENT_A}/payload.txt`), "x", "raw", {
        contentType: "text/plain",
      }),
    );
  });

  it("client A cannot upload into client B's attachment folder", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      uploadString(ref(storage, `attachments/${CLIENT_B}/steal.png`), "nope", "raw", {
        contentType: "image/png",
      }),
    );
  });

  it("client A cannot read client B's attachment", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(getBytes(ref(storage, `attachments/${CLIENT_B}/ref.png`)));
  });
});

describe("storage — avatars (owner-or-admin writes, any signed-in read)", () => {
  it("a user uploads their own avatar", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(
      uploadString(ref(storage, `avatars/${USER_A}/photo.png`), "me", "raw", {
        contentType: "image/png",
      }),
    );
  });

  it("a user cannot upload into someone else's avatar folder", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      uploadString(ref(storage, `avatars/${USER_B}/photo.png`), "nope", "raw", {
        contentType: "image/png",
      }),
    );
  });

  it("a non-image avatar upload is rejected", async () => {
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      uploadString(ref(storage, `avatars/${USER_A}/payload.txt`), "x", "raw", {
        contentType: "text/plain",
      }),
    );
  });

  it("any signed-in user can read an avatar, regardless of tenant", async () => {
    await seedStorage(async (storage) => {
      await uploadString(ref(storage, `avatars/${USER_B}/photo.png`), "them", "raw", {
        contentType: "image/png",
      });
    });
    const storage = st(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getBytes(ref(storage, `avatars/${USER_B}/photo.png`)));
  });

  it("unauthenticated access is denied", async () => {
    const storage = st(anonCtx());
    await assertFails(
      uploadString(ref(storage, `avatars/${USER_A}/photo.png`), "x", "raw", {
        contentType: "image/png",
      }),
    );
  });
});

describe("storage — admin", () => {
  it("reads and writes across any tenant folder", async () => {
    const storage = st(adminCtx());
    await assertSucceeds(getBytes(ref(storage, `deliverables/${CLIENT_B}/cut-01.mp4`)));
    await assertSucceeds(uploadString(ref(storage, `deliverables/${CLIENT_B}/v2.mp4`), "admin"));
    await assertSucceeds(getBytes(ref(storage, `attachments/${CLIENT_B}/ref.png`)));
  });
});
