"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAnnouncement,
  createManualAdjustment,
  removeMember,
  setMemberDisabled,
  updateMemberRole,
} from "@/lib/adminData";
import { requireAdminPageAccess } from "@/lib/adminAccess";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function toAmountPence(value: string) {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100);
}

function redirectWithStatus(path: string, status: "success" | "error", message: string) {
  const url = new URL(path, "https://team-social-fund.local");
  url.searchParams.set(status, message);
  redirect(`${url.pathname}${url.search}`);
}

export async function changeMemberRoleAction(formData: FormData) {
  const admin = await requireAdminPageAccess();
  const targetUid = getString(formData, "targetUid");
  const role = getString(formData, "role") === "admin" ? "admin" : "member";
  const returnTo = getString(formData, "returnTo") || "/admin/members/";

  try {
    await updateMemberRole({
      actorUid: admin.uid,
      targetUid,
      role,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/members");
    redirectWithStatus(returnTo, "success", "Member role updated.");
  } catch (error) {
    redirectWithStatus(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to update member role."
    );
  }
}

export async function toggleMemberDisabledAction(formData: FormData) {
  const admin = await requireAdminPageAccess();
  const targetUid = getString(formData, "targetUid");
  const disabled = getString(formData, "disabled") === "true";
  const returnTo = getString(formData, "returnTo") || "/admin/members/";

  try {
    await setMemberDisabled({
      actorUid: admin.uid,
      targetUid,
      disabled,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/members");
    redirectWithStatus(
      returnTo,
      "success",
      disabled ? "Member disabled." : "Member re-enabled."
    );
  } catch (error) {
    redirectWithStatus(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to update member access."
    );
  }
}

export async function removeMemberAction(formData: FormData) {
  const admin = await requireAdminPageAccess();
  const targetUid = getString(formData, "targetUid");
  const returnTo = getString(formData, "returnTo") || "/admin/members/";

  try {
    await removeMember({
      actorUid: admin.uid,
      targetUid,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/members");
    redirectWithStatus(returnTo, "success", "Member removed from the team.");
  } catch (error) {
    redirectWithStatus(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to remove member."
    );
  }
}

export async function createManualAdjustmentAction(formData: FormData) {
  const admin = await requireAdminPageAccess();
  const returnTo = getString(formData, "returnTo") || "/admin/ledger/";
  const amountPence = toAmountPence(getString(formData, "amount"));
  const note = getString(formData, "note");

  try {
    await createManualAdjustment({
      actorUid: admin.uid,
      amountPence,
      note,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/banking");
    revalidatePath("/admin/ledger");
    redirectWithStatus(returnTo, "success", "Manual adjustment recorded.");
  } catch (error) {
    redirectWithStatus(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to record manual adjustment."
    );
  }
}

export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireAdminPageAccess();
  const title = getString(formData, "title");
  const message = getString(formData, "message");
  const returnTo = getString(formData, "returnTo") || "/admin/settings/";

  try {
    await createAnnouncement({
      actorUid: admin.uid,
      actorDisplayName: admin.displayName,
      title,
      message,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    redirectWithStatus(returnTo, "success", "Announcement published.");
  } catch (error) {
    redirectWithStatus(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to publish announcement."
    );
  }
}
