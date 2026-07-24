import { familyService } from '@src/firebase';
import type { User } from '@types';
import { create } from 'zustand';

interface FamilyMembersStore {
    membersByUid: Record<string, User>;

    initialize: (familyId: string) => Promise<void>;
    cleanup: () => void;
    getMemberName: (uid?: string) => string | null;
}

/**
 * Family members loaded once per session (name/email lookup only) - used to
 * show "created by" / "last updated by" on task cards without refetching
 * per task. Not a live subscription: new members show up next time the
 * family list is (re)loaded, which matches how family details are already
 * fetched elsewhere (e.g. SettingsScreen).
 */
export const useFamilyMembersStore = create<FamilyMembersStore>((set, get) => ({
    membersByUid: {},

    initialize: async (familyId: string) => {
        try {
            const members = await familyService.getFamilyMembers(familyId);
            const membersByUid: Record<string, User> = {};
            members.forEach((member) => {
                membersByUid[member.uid] = member;
            });
            set({ membersByUid });
        } catch (error) {
            console.error('[FamilyMembersStore] Error loading family members:', error);
        }
    },

    cleanup: () => {
        set({ membersByUid: {} });
    },

    getMemberName: (uid?: string) => {
        if (!uid) return null;
        const member = get().membersByUid[uid];
        return member?.displayName || member?.email || null;
    },
}));
