// Groups state management

import { create } from 'zustand';
import type { Group } from '../types';

interface GroupsState {
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;
  getGroupById: (id: string) => Group | undefined;
  getMyGroups: (userId: string) => Group[];
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],

  setGroups: (groups: Group[]) => {
    set({ groups });
  },

  addGroup: (group: Group) => {
    set((state) => ({ groups: [...state.groups, group] }));
  },

  updateGroup: (id: string, updates: Partial<Group>) => {
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id ? { ...group, ...updates } : group
      ),
    }));
  },

  removeGroup: (id: string) => {
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id),
    }));
  },

  getGroupById: (id: string) => {
    return get().groups.find((group) => group.id === id);
  },

  getMyGroups: (userId: string) => {
    return get().groups.filter((group) =>
      group.members?.some((m) => m.userId === userId)
    );
  },
}));
