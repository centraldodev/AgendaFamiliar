/**
 * Os dados que a função da Ive lê e grava, atrás de uma interface pequena (os testes usam uma versão em memória).
 *
 * Grava como o app (infrastructure/repositories/FirestoreTaskRepository.ts): serverTimestamp em createdAt/updatedAt,
 * lastModifiedBy, exclusão suave por deletedAt. Coleções só da Ive, fechadas para o app pelo `match /{document=**}`:
 * - iveTokens/{id}   { hash (SHA-256 do token), uid, nome, criadoEm, usadoEm, revogado }
 * - ivePedidos/{id}  { expira }: cada X-Ive-Request vale uma vez (TTL no campo "expira")
 */
import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import type { Papel, Pessoa, Tarefa } from "./agenda";

export interface Token { id: string; uid: string; nome: string; criadoEm?: string; usadoEm?: string; revogado: boolean }
export interface NovaTarefa {
  title: string; dueDate: string; dueTime: string | null; category: string; isPrivate: boolean;
  recurrence?: Tarefa["recurrence"]; weekDays?: number[]; recurrenceEndDate?: string; description?: string;
  subtasks?: Tarefa["subtasks"];
}
export type Mudanca = Partial<Pick<Tarefa, "completed" | "dueDate" | "dueTime" | "subtasks" | "title" | "category"
  | "isPrivate" | "recurrence" | "weekDays" | "recurrenceEndDate" | "createdBy">> & { deleted?: boolean };
export interface Membro { uid: string; nome: string; role?: Papel }
export interface Aprovacao {
  id: string; taskId: string; requestedBy: string; userName: string; action: "update" | "delete" | "complete";
  data: Record<string, unknown>; createdAt?: string;
}

export interface Repo {
  tokenPorHash(hash: string): Promise<(Token & { hash: string }) | null>;
  marcarUso(tokenId: string): Promise<void>;
  registrarPedido(id: string, expira: Date): Promise<boolean>;
  pessoa(uid: string): Promise<Pessoa | null>;
  tarefas(p: Pessoa): Promise<Tarefa[]>;                 // da família (sem as privadas dos outros), sem as apagadas
  tarefa(id: string): Promise<Tarefa | null>;             // qualquer uma (inclusive apagada): quem chama confere
  categorias(familyId: string): Promise<{ id: string; label: string }[]>;
  criar(p: Pessoa, nova: NovaTarefa): Promise<string>;
  mudar(p: Pessoa, id: string, mudanca: Mudanca): Promise<void>;
  pedirAprovacao(p: Pessoa, tarefaId: string, acao: "update" | "delete" | "complete", dados: Record<string, unknown>): Promise<void>;
  membros(familyId: string): Promise<Membro[]>;
  mudarMembro(uid: string, mudanca: { displayName?: string; familyId?: string | null; role?: Papel | null }): Promise<void>;
  aprovacoes(familyId: string): Promise<Aprovacao[]>;                // só as pendentes
  responderAprovacao(id: string, status: "approved" | "rejected"): Promise<void>;
  criarToken(uid: string, nome: string, hash: string): Promise<string>;
  tokens(uid: string): Promise<Token[]>;
  revogar(uid: string, id: string): Promise<boolean>;
}

const iso = (v: unknown): string | undefined => {
  if (!v) return undefined;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate().toISOString();
  return typeof v === "string" ? v : undefined;
};

function paraTarefa(id: string, d: FirebaseFirestore.DocumentData): Tarefa {
  return {
    id, title: String(d.title || ""), description: d.description || "", dueDate: String(d.dueDate || ""),
    dueTime: d.dueTime || null, category: String(d.category || "other"), completed: Boolean(d.completed),
    recurrence: d.recurrence || "none", subtasks: Array.isArray(d.subtasks) ? d.subtasks : [],
    familyId: String(d.familyId || ""), createdBy: String(d.createdBy || ""), isPrivate: d.isPrivate === true,
    deleted: Boolean(d.deletedAt), weekDays: Array.isArray(d.weekDays) ? d.weekDays : undefined,
    recurrenceEndDate: d.recurrenceEndDate || undefined,
  };
}

export function firestoreRepo(db: Firestore): Repo {
  return {
    async tokenPorHash(hash) {
      const snap = await db.collection("iveTokens").where("hash", "==", hash).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0].data();
      return { id: snap.docs[0].id, hash, uid: d.uid, nome: d.nome || "", revogado: Boolean(d.revogado) };
    },
    async marcarUso(tokenId) {
      await db.collection("iveTokens").doc(tokenId).update({ usadoEm: FieldValue.serverTimestamp() });
    },
    async registrarPedido(id, expira) {
      try {
        await db.collection("ivePedidos").doc(id).create({ expira: Timestamp.fromDate(expira) });
        return true;
      } catch {
        return false;
      }
    },
    async pessoa(uid) {
      const snap = await db.collection("users").doc(uid).get();
      if (!snap.exists) return null;
      const d = snap.data() || {};
      const role: Papel | undefined = ["admin", "parent", "dependent"].includes(d.role) ? d.role : undefined;
      return { uid, familyId: d.familyId || undefined, role, nome: d.displayName || d.email || "" };
    },
    async tarefas(p) {
      if (!p.familyId) return [];
      // Duas consultas, como o app: as da família (públicas) e as minhas privadas
      const [publicas, privadas] = await Promise.all([
        db.collection("tasks").where("familyId", "==", p.familyId).where("isPrivate", "==", false).get(),
        db.collection("tasks").where("familyId", "==", p.familyId).where("isPrivate", "==", true)
          .where("createdBy", "==", p.uid).get(),
      ]);
      return [...publicas.docs, ...privadas.docs].map((doc) => paraTarefa(doc.id, doc.data())).filter((t) => !t.deleted);
    },
    async tarefa(id) {
      const snap = await db.collection("tasks").doc(id).get();
      return snap.exists ? paraTarefa(snap.id, snap.data() || {}) : null;
    },
    async categorias(familyId) {
      const snap = await db.collection("categories").where("familyId", "==", familyId).get();
      return snap.docs.map((doc) => ({ id: doc.id, label: String(doc.data().label || "") }));
    },
    async criar(p, nova) {
      const dados: Record<string, unknown> = {
        title: nova.title, description: nova.description || "", dueDate: nova.dueDate, dueTime: nova.dueTime || null,
        category: nova.category, completed: false, recurrence: nova.recurrence || "none",
        subtasks: nova.subtasks || [], userId: p.uid, familyId: p.familyId, createdBy: p.uid,
        isPrivate: nova.isPrivate, lastModifiedBy: p.uid,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      if (nova.weekDays !== undefined) dados.weekDays = nova.weekDays;
      if (nova.recurrenceEndDate !== undefined) dados.recurrenceEndDate = nova.recurrenceEndDate;
      return (await db.collection("tasks").add(dados)).id;
    },
    async mudar(p, id, mudanca) {
      const { deleted, ...resto } = mudanca;
      const dados: Record<string, unknown> = { ...resto, updatedAt: FieldValue.serverTimestamp(), lastModifiedBy: p.uid };
      if (deleted !== undefined) dados.deletedAt = deleted ? FieldValue.serverTimestamp() : null;
      Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k]);
      await db.collection("tasks").doc(id).update(dados);
    },
    async pedirAprovacao(p, tarefaId, acao, dados) {
      await db.collection("approvals").add({
        familyId: p.familyId, taskId: tarefaId, requestedBy: p.uid, userName: p.nome, action: acao, data: dados,
        status: "pending", createdAt: FieldValue.serverTimestamp(),
      });
    },
    async membros(familyId) {
      const snap = await db.collection("users").where("familyId", "==", familyId).get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        const role: Papel | undefined = ["admin", "parent", "dependent"].includes(d.role) ? d.role : undefined;
        return { uid: doc.id, nome: String(d.displayName || String(d.email || "").split("@")[0] || ""), role };
      });
    },
    async mudarMembro(uid, mudanca) {
      const dados: Record<string, unknown> = { ...mudanca };
      Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k]);
      await db.collection("users").doc(uid).update(dados);
    },
    async aprovacoes(familyId) {
      const snap = await db.collection("approvals").where("familyId", "==", familyId).where("status", "==", "pending").get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, taskId: String(d.taskId || ""), requestedBy: String(d.requestedBy || ""),
                 userName: String(d.userName || ""), action: d.action, data: d.data || {}, createdAt: iso(d.createdAt) };
      }).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    },
    async responderAprovacao(id, status) {
      await db.collection("approvals").doc(id).update({ status });  // as regras do app: só o status muda
    },
    async criarToken(uid, nome, hash) {
      const ref = await db.collection("iveTokens").add({ hash, uid, nome, criadoEm: FieldValue.serverTimestamp(), usadoEm: null, revogado: false });
      return ref.id;
    },
    async tokens(uid) {
      const snap = await db.collection("iveTokens").where("uid", "==", uid).get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, uid, nome: d.nome || "", criadoEm: iso(d.criadoEm), usadoEm: iso(d.usadoEm), revogado: Boolean(d.revogado) };
      }).filter((t) => !t.revogado);
    },
    async revogar(uid, id) {
      const ref = db.collection("iveTokens").doc(id);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.uid !== uid) return false;
      await ref.update({ revogado: true });
      return true;
    },
  };
}
