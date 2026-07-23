"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTaskWritten = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const firestore_2 = require("firebase-functions/v2/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;
/**
 * Resolves which users should be notified about a task change and returns
 * their Expo push tokens, excluding the user who made the change.
 */
async function resolveRecipientTokens(task, actorUid) {
    if (!task.familyId)
        return [];
    // Private tasks: only the creator's other devices should hear about it
    const recipientUids = task.isPrivate
        ? task.createdBy
            ? [task.createdBy]
            : []
        : await (async () => {
            const snapshot = await db
                .collection("users")
                .where("familyId", "==", task.familyId)
                .get();
            return snapshot.docs.map((d) => d.id);
        })();
    const filteredUids = recipientUids.filter((uid) => uid !== actorUid);
    if (filteredUids.length === 0)
        return [];
    const userDocs = await db.getAll(...filteredUids.map((uid) => db.collection("users").doc(uid)));
    const tokens = new Set();
    for (const doc of userDocs) {
        const data = doc.data();
        const pushTokens = data?.pushTokens;
        pushTokens?.forEach((t) => tokens.add(t));
    }
    return Array.from(tokens);
}
async function sendExpoPush(messages) {
    if (messages.length === 0)
        return;
    for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
        const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(batch),
            });
            const result = await response.json();
            firebase_functions_1.logger.info("[sendExpoPush] batch result", { result });
        }
        catch (error) {
            firebase_functions_1.logger.error("[sendExpoPush] failed to send batch", error);
        }
    }
}
function buildMessage(token, title, body, data) {
    return {
        to: token,
        sound: "default",
        title,
        body,
        data,
        channelId: "default",
        priority: "high",
    };
}
/**
 * Fires on every write to a task document and notifies other family members
 * so their devices can reconcile local notifications even if the app is
 * closed - this is what makes the shared agenda feel "live" across devices.
 */
exports.onTaskWritten = (0, firestore_2.onDocumentWritten)("tasks/{taskId}", async (event) => {
    const taskId = event.params.taskId;
    const before = event.data?.before.exists
        ? event.data.before.data()
        : null;
    const after = event.data?.after.exists
        ? event.data.after.data()
        : null;
    if (!after) {
        // Hard delete (rare - the app soft-deletes). Nothing to reconcile.
        return;
    }
    const actorUid = after.lastModifiedBy ?? before?.lastModifiedBy;
    const baseData = {
        taskId,
        title: after.title,
        dueDate: after.dueDate,
        dueTime: after.dueTime ?? null,
        recurrence: after.recurrence,
    };
    let type = null;
    let title = "";
    let body = "";
    const wasDeleted = !!before?.deletedAt;
    const isDeleted = !!after.deletedAt;
    const wasCompleted = before?.completed ?? false;
    const isCompleted = after.completed;
    if (!before) {
        // New task created
        if (!isCompleted && !isDeleted) {
            type = "task-created";
            title = "Nova tarefa";
            body = `"${after.title}" foi adicionada à agenda.`;
        }
    }
    else if (!wasDeleted && isDeleted) {
        type = "task-deleted";
        title = "Tarefa removida";
        body = `"${after.title}" foi removida da agenda.`;
    }
    else if (!wasCompleted && isCompleted) {
        type = "task-completed";
        title = "Tarefa concluída";
        body = `"${after.title}" foi concluída.`;
    }
    else if (wasCompleted && !isCompleted) {
        type = "task-reopened";
        title = "Tarefa reaberta";
        body = `"${after.title}" foi reaberta.`;
    }
    else if (!isCompleted &&
        !isDeleted &&
        (before.dueDate !== after.dueDate || before.dueTime !== after.dueTime)) {
        type = "task-rescheduled";
        title = "Tarefa reagendada";
        body = `"${after.title}" mudou de data/horário.`;
    }
    if (!type)
        return;
    try {
        const tokens = await resolveRecipientTokens(after, actorUid);
        if (tokens.length === 0)
            return;
        const messages = tokens.map((token) => buildMessage(token, title, body, { ...baseData, type, completed: isCompleted }));
        await sendExpoPush(messages);
        firebase_functions_1.logger.info(`[onTaskWritten] Sent '${type}' push for task ${taskId} to ${tokens.length} device(s)`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`[onTaskWritten] Failed to process task ${taskId}`, error);
    }
});
//# sourceMappingURL=index.js.map