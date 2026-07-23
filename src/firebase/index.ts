/**
 * Firebase - Exportação Centralizada
 * 
 * Ponto único de acesso para todos os serviços e configurações do Firebase
 * Facilita imports e manutenção
 */

// Configuração
export { auth, firestore, db, isFirebaseReady } from './config/firebase.config';
export { default as firebase } from './config/firebase.config';

// Serviços de Autenticação
export { authService } from './services/auth';

// Serviços de Database
export {
    userService,
    taskService,
    categoryService,
    familyService
} from './services/database';

// Serviços de Notificações
export { BACKGROUND_NOTIFICATION_TASK, notificationService } from './services/notifications';
export type { TaskPushData } from './services/notifications';
export { BACKGROUND_SYNC_TASK, registerBackgroundSync } from './services/notifications';
