import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/app/api/_lib/firebaseAdmin";
import { fetchTeamBalance, getTrueLayerDataSettings } from "@/app/api/_lib/truelayerData";
import { getMemberRecord } from "@/lib/isAdmin";
import { TEAM_ID, teamMemberPath, teamPath } from "@/lib/team";

export type AdminMemberRow = {
  uid: string;
  displayName: string;
  email: string;
  role: "member" | "admin";
  disabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  disabledAt: string | null;
};

export type LedgerEntryRow = {
  id: string;
  type: "fine" | "payment" | "manual-adjustment";
  amount: number;
  amountPence: number;
  userId: string | null;
  offenceCode: string | null;
  createdBy: string | null;
  note: string | null;
  teamId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DashboardSummary = {
  confirmedBalancePence: number;
  pendingBalancePence: number;
  memberCount: number;
  adminCount: number;
  disabledCount: number;
  pendingAccusationCount: number;
  bankConnected: boolean;
  bankProvider: string | null;
  bankAccountDisplayName: string | null;
  bankLastUpdated: string | null;
  ledgerEntryCount: number;
  announcementCount: number;
  latestLedgerEntry: LedgerEntryRow | null;
};

type BankingSummary = {
  confirmedBalancePence: number;
  pendingBalancePence: number;
  provider: string | null;
  accountDisplayName: string | null;
  currency: string;
  connectedAt: string | null;
  lastUpdated: string | null;
  liveBalance: number | null;
  liveBalanceUpdatedAt: string | null;
  liveBalanceError: string | null;
  settings: ReturnType<typeof getTrueLayerDataSettings>;
  recentLedger: LedgerEntryRow[];
};

function toIso(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
}

function toMemberRow(uid: string, data: Record<string, unknown>): AdminMemberRow {
  return {
    uid,
    displayName: String(data.displayName || data.email || uid),
    email: String(data.email || ""),
    role: data.role === "admin" ? "admin" : "member",
    disabled: data.disabled === true,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    disabledAt: toIso(data.disabledAt),
  };
}

function toLedgerEntry(id: string, data: Record<string, unknown>): LedgerEntryRow {
  const amountPence =
    Number.isFinite(Number(data.amountPence))
      ? Number(data.amountPence)
      : Math.round(Number(data.amount || 0) * 100);

  return {
    id,
    type: data.type === "payment" || data.type === "manual-adjustment" ? (data.type as LedgerEntryRow["type"]) : "fine",
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : amountPence / 100,
    amountPence,
    userId: typeof data.userId === "string" ? data.userId : null,
    offenceCode: typeof data.offenceCode === "string" ? data.offenceCode : null,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    note: typeof data.note === "string" ? data.note : null,
    teamId: typeof data.teamId === "string" ? data.teamId : TEAM_ID,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function toAnnouncement(id: string, data: Record<string, unknown>): AnnouncementRow {
  return {
    id,
    title: String(data.title || "Announcement"),
    message: String(data.message || ""),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function membersCollection() {
  return getAdminDb().collection(`${teamPath()}/members`);
}

function teamDocument() {
  return getAdminDb().doc(teamPath());
}

function ledgerCollection() {
  return getAdminDb().collection("fundLedger");
}

function announcementCollection() {
  return getAdminDb().collection(`${teamPath()}/announcements`);
}

function integrationDocument() {
  return getAdminDb().doc(`${teamPath()}/integrations/truelayer`);
}

async function ensureAnotherActiveAdminExists(targetUid: string) {
  const adminsSnapshot = await membersCollection().where("role", "==", "admin").get();
  const remainingAdmins = adminsSnapshot.docs.filter((docSnapshot) => {
    if (docSnapshot.id === targetUid) return false;
    return docSnapshot.data().disabled !== true;
  });

  if (remainingAdmins.length === 0) {
    throw new Error("At least one active admin must remain.");
  }
}

function normalizeDisplayName(value: unknown, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

export function formatMoney(pence = 0) {
  return `£${(Number(pence || 0) / 100).toFixed(2)}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function listMembers() {
  const snapshot = await membersCollection().get();
  return snapshot.docs
    .map((docSnapshot) => toMemberRow(docSnapshot.id, docSnapshot.data()))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "en-GB"));
}

export async function listLedgerEntries(limitCount = 100) {
  const snapshot = await ledgerCollection().orderBy("createdAt", "desc").limit(limitCount).get();
  return snapshot.docs
    .map((docSnapshot) => toLedgerEntry(docSnapshot.id, docSnapshot.data()))
    .filter((entry) => !entry.teamId || entry.teamId === TEAM_ID);
}

export async function listAnnouncements(limitCount = 10) {
  const snapshot = await announcementCollection().orderBy("createdAt", "desc").limit(limitCount).get();
  return snapshot.docs.map((docSnapshot) => toAnnouncement(docSnapshot.id, docSnapshot.data()));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [teamSnapshot, membersSnapshot, scnsSnapshot, integrationSnapshot, ledgerSnapshot, announcementsSnapshot] =
    await Promise.all([
      teamDocument().get(),
      membersCollection().get(),
      getAdminDb()
        .collection(`${teamPath()}/scns`)
        .where("stage", "in", ["awaiting_plea", "court_requested"])
        .get(),
      integrationDocument().get(),
      ledgerCollection().orderBy("createdAt", "desc").limit(1).get(),
      announcementCollection().get(),
    ]);

  const team = teamSnapshot.exists ? teamSnapshot.data() || {} : {};
  const members = membersSnapshot.docs.map((docSnapshot) => toMemberRow(docSnapshot.id, docSnapshot.data()));
  const integration = integrationSnapshot.exists ? integrationSnapshot.data() || {} : {};
  const latestLedgerEntry = ledgerSnapshot.docs[0]
    ? toLedgerEntry(ledgerSnapshot.docs[0].id, ledgerSnapshot.docs[0].data())
    : null;

  return {
    confirmedBalancePence: Number(team.confirmedBalancePence || 0),
    pendingBalancePence: Number(team.pendingBalancePence || 0),
    memberCount: members.length,
    adminCount: members.filter((member) => member.role === "admin").length,
    disabledCount: members.filter((member) => member.disabled).length,
    pendingAccusationCount: scnsSnapshot.size,
    bankConnected: integrationSnapshot.exists && Boolean(integration.accountId),
    bankProvider: typeof integration.provider === "string" ? integration.provider : null,
    bankAccountDisplayName:
      typeof integration.accountDisplayName === "string" ? integration.accountDisplayName : null,
    bankLastUpdated: toIso(integration.updatedAt || integration.lastBalanceAt || integration.connectedAt),
    ledgerEntryCount: latestLedgerEntry ? 1 : 0,
    announcementCount: announcementsSnapshot.size,
    latestLedgerEntry,
  };
}

export async function getBankingSummary(): Promise<BankingSummary> {
  const [teamSnapshot, integrationSnapshot, recentLedger] = await Promise.all([
    teamDocument().get(),
    integrationDocument().get(),
    listLedgerEntries(6),
  ]);

  const team = teamSnapshot.exists ? teamSnapshot.data() || {} : {};
  const integration = integrationSnapshot.exists ? integrationSnapshot.data() || {} : {};
  const settings = getTrueLayerDataSettings();

  let liveBalance: number | null = null;
  let liveBalanceUpdatedAt: string | null = null;
  let liveBalanceError: string | null = null;

  if (integrationSnapshot.exists && integration.accountId && settings.configured) {
    try {
      const balance = await fetchTeamBalance(TEAM_ID);
      liveBalance = balance.balance;
      liveBalanceUpdatedAt = balance.lastUpdated;
    } catch (error) {
      liveBalanceError = error instanceof Error ? error.message : "Unable to load live bank balance.";
    }
  } else if (!settings.configured && settings.configError) {
    liveBalanceError = settings.configError;
  }

  return {
    confirmedBalancePence: Number(team.confirmedBalancePence || 0),
    pendingBalancePence: Number(team.pendingBalancePence || 0),
    provider: typeof integration.provider === "string" ? integration.provider : null,
    accountDisplayName:
      typeof integration.accountDisplayName === "string" ? integration.accountDisplayName : null,
    currency: typeof integration.currency === "string" ? integration.currency : "GBP",
    connectedAt: toIso(integration.connectedAt),
    lastUpdated: toIso(integration.lastBalanceAt || integration.updatedAt),
    liveBalance,
    liveBalanceUpdatedAt,
    liveBalanceError,
    settings,
    recentLedger,
  };
}

export async function updateMemberRole(params: {
  actorUid: string;
  targetUid: string;
  role: "member" | "admin";
}) {
  if (params.actorUid === params.targetUid && params.role !== "admin") {
    throw new Error("You cannot remove your own admin access from the admin console.");
  }

  const target = await getMemberRecord(params.targetUid, TEAM_ID);
  if (!target) {
    throw new Error("Member record not found.");
  }

  if (target.role === "admin" && params.role !== "admin") {
    await ensureAnotherActiveAdminExists(params.targetUid);
  }

  await getAdminDb().doc(teamMemberPath(params.targetUid)).set(
    {
      role: params.role,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setMemberDisabled(params: {
  actorUid: string;
  targetUid: string;
  disabled: boolean;
}) {
  if (params.actorUid === params.targetUid && params.disabled) {
    throw new Error("You cannot disable your own account from the admin console.");
  }

  const target = await getMemberRecord(params.targetUid, TEAM_ID);
  if (!target) {
    throw new Error("Member record not found.");
  }

  if (target.role === "admin" && params.disabled) {
    await ensureAnotherActiveAdminExists(params.targetUid);
  }

  await getAdminAuth().updateUser(params.targetUid, { disabled: params.disabled });

  await getAdminDb().doc(teamMemberPath(params.targetUid)).set(
    {
      disabled: params.disabled,
      disabledAt: params.disabled ? FieldValue.serverTimestamp() : FieldValue.delete(),
      disabledBy: params.disabled ? params.actorUid : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeMember(params: {
  actorUid: string;
  targetUid: string;
}) {
  if (params.actorUid === params.targetUid) {
    throw new Error("You cannot remove your own account from the admin console.");
  }

  const target = await getMemberRecord(params.targetUid, TEAM_ID);
  if (!target) {
    throw new Error("Member record not found.");
  }

  if (target.role === "admin") {
    await ensureAnotherActiveAdminExists(params.targetUid);
  }

  await getAdminDb().doc(teamMemberPath(params.targetUid)).delete();
}

export async function createManualAdjustment(params: {
  actorUid: string;
  amountPence: number;
  note?: string;
  userId?: string | null;
  offenceCode?: string | null;
}) {
  const amountPence = Math.trunc(params.amountPence);
  if (!Number.isFinite(amountPence) || amountPence === 0) {
    throw new Error("Enter a non-zero amount.");
  }

  const note = typeof params.note === "string" ? params.note.trim().slice(0, 240) : "";
  const ledgerRef = ledgerCollection().doc();

  await Promise.all([
    teamDocument().set(
      {
        confirmedBalancePence: FieldValue.increment(amountPence),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    ),
    ledgerRef.set({
      teamId: TEAM_ID,
      type: "manual-adjustment",
      amount: amountPence / 100,
      amountPence,
      userId: params.userId || null,
      offenceCode: params.offenceCode || null,
      note: note || null,
      createdBy: params.actorUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  ]);

  return ledgerRef.id;
}

export async function createAnnouncement(params: {
  actorUid: string;
  actorDisplayName?: string;
  title: string;
  message: string;
}) {
  const title = params.title.trim().slice(0, 120);
  const message = params.message.trim().slice(0, 1200);

  if (!title || !message) {
    throw new Error("Title and message are required.");
  }

  const authorName = normalizeDisplayName(params.actorDisplayName, params.actorUid);

  await announcementCollection().add({
    title,
    message,
    createdBy: params.actorUid,
    createdByName: authorName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function buildLedgerCsv() {
  const entries = await listLedgerEntries(500);
  const lines = [
    ["Entry ID", "Type", "Amount", "Amount Pence", "User ID", "Offence Code", "Created By", "Note", "Created At"],
    ...entries.map((entry) => [
      entry.id,
      entry.type,
      entry.amount.toFixed(2),
      String(entry.amountPence),
      entry.userId || "",
      entry.offenceCode || "",
      entry.createdBy || "",
      (entry.note || "").replaceAll("\n", " "),
      entry.createdAt || "",
    ]),
  ];

  return lines
    .map((line) =>
      line
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}
