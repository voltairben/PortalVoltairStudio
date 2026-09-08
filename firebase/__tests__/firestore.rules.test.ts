import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { beforeEach, describe, it } from "vitest";
import {
  CLIENT_A,
  CLIENT_B,
  USER_A,
  USER_B,
  adminCtx,
  anonCtx,
  clientCtx,
  clientCompanyDoc,
  commentDoc,
  deliverableDoc,
  fs,
  projectDoc,
  seed,
  userProfileDoc,
} from "./helpers";

beforeEach(async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "clients", CLIENT_A), clientCompanyDoc(CLIENT_A));
    await setDoc(doc(db, "clients", CLIENT_B), clientCompanyDoc(CLIENT_B));
    await setDoc(doc(db, "users", USER_A), userProfileDoc(USER_A, CLIENT_A));
    await setDoc(doc(db, "users", USER_B), userProfileDoc(USER_B, CLIENT_B));
    await setDoc(doc(db, "projects", "proj-a"), projectDoc(CLIENT_A));
    await setDoc(doc(db, "projects", "proj-b"), projectDoc(CLIENT_B));
    await setDoc(doc(db, "deliverables", "del-a"), deliverableDoc(CLIENT_A, "proj-a"));
    await setDoc(doc(db, "deliverables", "del-b"), deliverableDoc(CLIENT_B, "proj-b"));
    await setDoc(doc(db, "comments", "cmt-b"), commentDoc(CLIENT_B, { userId: USER_B }));
  });
});

describe("unauthenticated", () => {
  it("cannot read or write anything", async () => {
    const db = fs(anonCtx());
    await assertFails(getDoc(doc(db, "projects", "proj-a")));
    await assertFails(getDoc(doc(db, "clients", CLIENT_A)));
    await assertFails(setDoc(doc(db, "projects", "proj-x"), projectDoc(CLIENT_A)));
  });
});

describe("Test 1 — single-document breach", () => {
  it("client A cannot getDoc client B's project", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(getDoc(doc(db, "projects", "proj-b")));
  });

  it("client A can read its own project", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getDoc(doc(db, "projects", "proj-a")));
  });
});

describe("Test 2 — query leak", () => {
  it("client A cannot query projects filtered to client B", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      getDocs(query(collection(db, "projects"), where("clientId", "==", CLIENT_B))),
    );
  });

  it("client A can query its own projects", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(
      getDocs(query(collection(db, "projects"), where("clientId", "==", CLIENT_A))),
    );
  });

  it("an unscoped collection read is denied (would leak all tenants)", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(getDocs(collection(db, "projects")));
  });
});

describe("Test 3 — deliverables, comments, cross-tenant integrity", () => {
  it("client A cannot read client B's deliverable or comment", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(getDoc(doc(db, "deliverables", "del-b")));
    await assertFails(getDoc(doc(db, "comments", "cmt-b")));
    await assertFails(
      getDocs(query(collection(db, "deliverables"), where("clientId", "==", CLIENT_B))),
    );
  });

  it("client A cannot write into client B's tenant", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(setDoc(doc(db, "projects", "proj-b"), projectDoc(CLIENT_B)));
    await assertFails(setDoc(doc(db, "deliverables", "del-b"), deliverableDoc(CLIENT_B, "proj-b")));
  });
});

describe("comment creation rules", () => {
  it("client A can post a comment scoped to its own tenant, authored as itself", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(
      setDoc(doc(db, "comments", "cmt-new"), commentDoc(CLIENT_A, { userId: USER_A })),
    );
  });

  it("client A cannot spoof another tenant's clientId on a comment", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      setDoc(doc(db, "comments", "cmt-spoof"), commentDoc(CLIENT_B, { userId: USER_A })),
    );
  });

  it("client A cannot post a comment as another user", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(
      setDoc(doc(db, "comments", "cmt-imp"), commentDoc(CLIENT_A, { userId: "someone-else" })),
    );
  });

  it("client A cannot edit or delete an existing comment", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await seed(async (sdb) => {
      await setDoc(doc(sdb, "comments", "cmt-a"), commentDoc(CLIENT_A, { userId: USER_A }));
    });
    await assertFails(updateDoc(doc(db, "comments", "cmt-a"), { text: "edited" }));
  });
});

describe("clients + users documents", () => {
  it("client A reads its own company doc, not client B's", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getDoc(doc(db, "clients", CLIENT_A)));
    await assertFails(getDoc(doc(db, "clients", CLIENT_B)));
  });

  it("a user reads only their own profile", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(getDoc(doc(db, "users", USER_A)));
    await assertFails(getDoc(doc(db, "users", USER_B)));
  });

  it("a user cannot escalate their own role or switch tenant", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertFails(updateDoc(doc(db, "users", USER_A), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "users", USER_A), { clientId: CLIENT_B }));
  });

  it("a user can update a non-privileged field on their own profile", async () => {
    const db = fs(clientCtx(USER_A, CLIENT_A));
    await assertSucceeds(updateDoc(doc(db, "users", USER_A), { displayName: "Renamed" }));
  });
});

describe("Admin — unrestricted across tenants", () => {
  it("reads any client's project, deliverable, comment, company", async () => {
    const db = fs(adminCtx());
    await assertSucceeds(getDoc(doc(db, "projects", "proj-a")));
    await assertSucceeds(getDoc(doc(db, "projects", "proj-b")));
    await assertSucceeds(getDoc(doc(db, "deliverables", "del-b")));
    await assertSucceeds(getDoc(doc(db, "comments", "cmt-b")));
    await assertSucceeds(getDoc(doc(db, "clients", CLIENT_B)));
    await assertSucceeds(getDocs(collection(db, "projects")));
  });

  it("writes across any tenant", async () => {
    const db = fs(adminCtx());
    await assertSucceeds(setDoc(doc(db, "projects", "proj-c"), projectDoc(CLIENT_B)));
    await assertSucceeds(setDoc(doc(db, "deliverables", "del-c"), deliverableDoc(CLIENT_A, "proj-a")));
    await assertSucceeds(setDoc(doc(db, "clients", "client-gamma"), clientCompanyDoc("client-gamma")));
  });
});
