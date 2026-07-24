export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom_weekly' | 'monthly' | 'yearly';
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Dom=0, Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sab=6

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  category: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string;
  category: string;
  completed: boolean;
  recurrence: RecurrenceType;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: any; // Timestamp or null
  notificationIds?: string[];
  familyId?: string;
  createdBy?: string;
  lastModifiedBy?: string; // uid of whoever last wrote to this task (edit, toggle, etc.)
  isPrivate?: boolean; // Private tasks are only visible to the creator
  weekDays?: WeekDay[]; // For custom_weekly recurrence - which days of week to repeat
  recurrenceEndDate?: string; // YYYY-MM-DD - when recurrence ends (undefined = never)
}

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
  familyId?: string;
  isDefault?: boolean;
  createdBy?: string;
}

export type UserRole = 'admin' | 'parent' | 'dependent';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  familyId?: string;
  role?: UserRole;
  preferences?: Preferences;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  familyId: string;
  taskId: string;
  requestedBy: string;
  userName: string;
  action: 'update' | 'delete' | 'complete';
  data: Partial<Task>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en';
  notifications: boolean;
}
