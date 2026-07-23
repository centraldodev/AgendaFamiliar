import firebase, { firestore, auth } from '@src/firebase/config/firebase.config';
import type { Task } from '@types';
import type { ITaskRepository } from '@domain/repositories/ITaskRepository';

const TASKS_COLLECTION = 'tasks';

/**
 * Firestore implementation of ITaskRepository
 * Concrete implementation that can be swapped for testing or different data sources
 */
export class FirestoreTaskRepository implements ITaskRepository {
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    if (!task.familyId) {
      throw new Error('Tarefa deve pertencer a uma família');
    }

    const now = new Date().toISOString();
    const taskData: Record<string, unknown> = {
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate,
      dueTime: task.dueTime || null,
      category: task.category,
      completed: task.completed,
      recurrence: task.recurrence || 'none',
      subtasks: task.subtasks || [],
      userId: user.uid,
      familyId: task.familyId,
      // Firestore rules require createdBy === request.auth.uid on create,
      // so the acting user always becomes the owner of a newly created doc
      // (this also applies when a recurring task spawns its next occurrence).
      createdBy: user.uid,
      isPrivate: task.isPrivate || false,
      lastModifiedBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Only include optional fields when defined - Firestore rejects `undefined` values
    if (task.weekDays !== undefined) taskData.weekDays = task.weekDays;
    if (task.recurrenceEndDate !== undefined) taskData.recurrenceEndDate = task.recurrenceEndDate;

    const docRef = await firestore.collection(TASKS_COLLECTION).add(taskData);

    return {
      ...task,
      id: docRef.id,
      createdBy: (taskData.createdBy as string),
      isPrivate: taskData.isPrivate as boolean,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, updates: Partial<Task>): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const cleanUpdates: any = { ...updates };
    Object.keys(cleanUpdates).forEach(
      key => cleanUpdates[key] === undefined && delete cleanUpdates[key]
    );

    cleanUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    cleanUpdates.lastModifiedBy = user.uid;

    await firestore
      .collection(TASKS_COLLECTION)
      .doc(id)
      .update(cleanUpdates);
  }

  async delete(id: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    // Soft delete
    await firestore.collection(TASKS_COLLECTION).doc(id).update({
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async getById(id: string): Promise<Task | null> {
    const doc = await firestore.collection(TASKS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
    } as Task;
  }

  subscribe(familyId: string, callback: (tasks: Task[]) => void): () => void {
    if (!familyId) {
      callback([]);
      return () => { };
    }

    const mapDoc = (doc: any): Task => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as Task;
    };

    // Firestore rejects a single query mixing public and private tasks outright:
    // the read rule depends on `isPrivate`, a field this query doesn't pin down,
    // so Firestore can't prove every possible match is compliant and denies the
    // whole request - even if no document actually violates the rule (verified
    // in firestore-tests/tasks.rules.test.js). Splitting into two rule-compliant
    // queries and merging client-side avoids that entirely.
    const uid = auth.currentUser?.uid;
    let publicTasks: Task[] = [];
    let privateTasks: Task[] = [];
    let publicLoaded = false;
    let privateLoaded = !uid;

    const emit = () => {
      if (!publicLoaded || !privateLoaded) return;
      const merged = new Map<string, Task>();
      publicTasks.forEach((t) => merged.set(t.id, t));
      privateTasks.forEach((t) => merged.set(t.id, t));
      callback(Array.from(merged.values()));
    };

    const unsubscribePublic = firestore
      .collection(TASKS_COLLECTION)
      .where('familyId', '==', familyId)
      .where('isPrivate', '==', false)
      .onSnapshot(
        (snapshot: any) => {
          publicTasks = snapshot.docs.map(mapDoc);
          publicLoaded = true;
          emit();
        },
        (error: any) => {
          console.error('Error subscribing to public tasks:', error);
        }
      );

    const unsubscribePrivate = uid
      ? firestore
        .collection(TASKS_COLLECTION)
        .where('familyId', '==', familyId)
        .where('isPrivate', '==', true)
        .where('createdBy', '==', uid)
        .onSnapshot(
          (snapshot: any) => {
            privateTasks = snapshot.docs.map(mapDoc);
            privateLoaded = true;
            emit();
          },
          (error: any) => {
            console.error('Error subscribing to private tasks:', error);
          }
        )
      : () => { };

    return () => {
      unsubscribePublic();
      unsubscribePrivate();
    };
  }

  async getOldCompletedTasks(familyId: string, beforeDate: string): Promise<Task[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const beforeTimestamp = new Date(beforeDate);

    // Simplified query to avoid composite index requirement
    // We'll filter by date in code instead
    const snapshot = await firestore
      .collection(TASKS_COLLECTION)
      .where('familyId', '==', familyId)
      .where('completed', '==', true)
      .get();

    // Filter by date in code
    return snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        };
      })
      .filter((task: Task) => {
        if (!task.updatedAt) return false;
        const updatedDate = new Date(task.updatedAt);
        return updatedDate < beforeTimestamp;
      }) as Task[];
  }
}

// Export singleton instance
export const firestoreTaskRepository = new FirestoreTaskRepository();
