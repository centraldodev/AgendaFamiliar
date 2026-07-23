import type { Preferences, User } from '@types';
import firebase, { firestore } from '../../config/firebase.config';

const USERS_COLLECTION = 'users';

/**
 * Serviço de Usuários
 * 
 * Responsável por operações CRUD de perfis de usuários no Firestore
 * Segue o Single Responsibility Principle (SRP)
 */
export const userService = {
    /**
     * Obtém o perfil de um usuário
     */
    async getUserProfile(uid: string): Promise<User | null> {
        try {
            const doc = await firestore.collection(USERS_COLLECTION).doc(uid).get();
            if (doc.exists) {
                return doc.data() as User;
            }
            return null;
        } catch (error) {
            console.error('[UserService] Error fetching user profile:', error);
            return null;
        }
    },

    /**
     * Cria um novo perfil de usuário
     */
    async createUserProfile(user: User): Promise<void> {
        try {
            // Sanitize user object to remove undefined values (Firestore doesn't like them)
            const safeUser = JSON.parse(JSON.stringify(user));
            await firestore.collection(USERS_COLLECTION).doc(user.uid).set(safeUser, { merge: true });
        } catch (error) {
            console.error('[UserService] Error creating user profile:', error);
            throw error;
        }
    },

    /**
     * Atualiza o perfil de um usuário
     */
    async updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
        try {
            await firestore.collection(USERS_COLLECTION).doc(uid).update(updates);
        } catch (error) {
            console.error('[UserService] Error updating profile:', error);
            throw error;
        }
    },

    /**
     * Atualiza as preferências do usuário (tema, idioma, notificações)
     */
    async updateUserPreferences(uid: string, preferences: Preferences): Promise<void> {
        try {
            await firestore.collection(USERS_COLLECTION).doc(uid).update({
                preferences: preferences
            });
            console.log('[UserService] Preferences updated in Firebase:', preferences);
        } catch (error) {
            console.error('[UserService] Error updating preferences:', error);
            throw error;
        }
    },

    /**
     * Registra o token de push (Expo) deste dispositivo no perfil do usuário.
     * Usado pelas Cloud Functions para notificar outros membros da família
     * mesmo quando o app não está aberto.
     */
    async addPushToken(uid: string, token: string): Promise<void> {
        try {
            await firestore.collection(USERS_COLLECTION).doc(uid).update({
                pushTokens: firebase.firestore.FieldValue.arrayUnion(token),
            });
        } catch (error) {
            console.error('[UserService] Error saving push token:', error);
        }
    },

    /**
     * Remove o token de push deste dispositivo (ex: no logout).
     */
    async removePushToken(uid: string, token: string): Promise<void> {
        try {
            await firestore.collection(USERS_COLLECTION).doc(uid).update({
                pushTokens: firebase.firestore.FieldValue.arrayRemove(token),
            });
        } catch (error) {
            console.error('[UserService] Error removing push token:', error);
        }
    },
};

export default userService;
