/**
 * Serviços de Notificações
 * Exportação centralizada
 */

export { BACKGROUND_NOTIFICATION_TASK, notificationService } from './notificationService';
export type { TaskPushData } from './notificationService';
export { default as notifications } from './notificationService';
export { BACKGROUND_SYNC_TASK, registerBackgroundSync } from './backgroundSync';
