import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";

export type AuditEventType =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "deactivate"
  | "select"
  | "message"
  | "member_add"
  | "member_invite"
  | "member_invite_accept"
  | "member_invite_decline"
  | "member_remove"
  | "goal_set";

export type AuditResourceType =
  | "recycling_group"
  | "recycling_action"
  | "plastic_consumption"
  | "competition_chat";

export type AuditPayload = Record<string, unknown>;

export async function recordAuditEvent(params: {
  eventType: AuditEventType;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  payload?: AuditPayload;
}) {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "audit_logs"), {
    eventType: params.eventType,
    resourceType: params.resourceType,
    resourceId: params.resourceId || null,
    payload: params.payload || {},
    actorId: user.uid,
    actorName: user.displayName?.trim() || user.email?.split("@")[0] || "Usuário",
    createdAt: serverTimestamp(),
    source: "client",
  });
}