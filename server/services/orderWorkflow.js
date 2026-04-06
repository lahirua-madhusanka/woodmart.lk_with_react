import supabase from "../config/supabase.js";

export const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

const AUTO_DELIVER_FROM_STATUSES = new Set(["shipped", "out_for_delivery"]);
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export const buildOrderLifecycleTimestamps = (nextStatus, nowIso = new Date().toISOString()) => {
  const patch = {};

  if (nextStatus === "shipped") {
    patch.shipped_at = nowIso;
  }

  if (nextStatus === "out_for_delivery") {
    patch.out_for_delivery_at = nowIso;
    patch.shipped_at = patch.shipped_at || nowIso;
  }

  if (nextStatus === "delivered") {
    patch.delivered_at = nowIso;
  }

  if (nextStatus === "cancelled") {
    patch.cancelled_at = nowIso;
  }

  if (nextStatus === "returned") {
    patch.returned_at = nowIso;
  }

  return patch;
};

export const addOrderStatusHistory = async ({ orderId, status, note = "", changedBy = null }) => {
  const { error } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    order_status: status,
    note: note || null,
    changed_by: changedBy,
  });

  if (error) {
    throw new Error(error.message);
  }
};

const shouldAutoDeliver = (orderRow = {}, now = Date.now()) => {
  const status = String(orderRow.order_status || "").toLowerCase();
  if (!AUTO_DELIVER_FROM_STATUSES.has(status)) {
    return false;
  }

  const alreadyDelivered = Boolean(orderRow.delivered_at);
  if (alreadyDelivered) {
    return false;
  }

  const referenceDate =
    orderRow.shipped_at ||
    orderRow.tracking_added_at ||
    orderRow.updated_at ||
    orderRow.created_at;

  if (!referenceDate) {
    return false;
  }

  const referenceMs = new Date(referenceDate).getTime();
  if (Number.isNaN(referenceMs)) {
    return false;
  }

  return now - referenceMs >= FIFTEEN_DAYS_MS;
};

export const autoDeliverIfDue = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }

  const nowIso = new Date().toISOString();
  const nowMs = new Date(nowIso).getTime();
  const nextRows = [...rows];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!shouldAutoDeliver(row, nowMs)) {
      continue;
    }

    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        order_status: "delivered",
        delivered_at: row.delivered_at || nowIso,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .select("*")
      .maybeSingle();

    if (error || !updated) {
      continue;
    }

    try {
      await addOrderStatusHistory({
        orderId: row.id,
        status: "delivered",
        note: "Auto-delivered after 15 days from shipping/tracking event",
        changedBy: null,
      });
    } catch {
      // Keep order delivery status even if history logging fails.
    }

    nextRows[index] = {
      ...row,
      order_status: "delivered",
      delivered_at: updated.delivered_at,
      updated_at: updated.updated_at,
    };
  }

  return nextRows;
};
