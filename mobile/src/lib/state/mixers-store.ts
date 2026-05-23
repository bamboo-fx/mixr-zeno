// Mixers and requests state management

import { create } from 'zustand';
import type { Mixer, MixerRequest, MixerRequestStatus } from '../types';

interface MixersState {
  mixers: Mixer[];
  requests: MixerRequest[];
  setMixers: (mixers: Mixer[]) => void;
  addMixer: (mixer: Mixer) => void;
  updateMixer: (id: string, updates: Partial<Mixer>) => void;
  getMixerById: (id: string) => Mixer | undefined;
  getMyMixers: (groupIds: string[]) => Mixer[];

  setRequests: (requests: MixerRequest[]) => void;
  addRequest: (request: MixerRequest) => void;
  updateRequestStatus: (id: string, status: MixerRequestStatus) => void;
  getIncomingRequests: (groupIds: string[]) => MixerRequest[];
  getOutgoingRequests: (groupIds: string[]) => MixerRequest[];
}

export const useMixersStore = create<MixersState>((set, get) => ({
  mixers: [],
  requests: [],

  setMixers: (mixers: Mixer[]) => {
    set({ mixers });
  },

  addMixer: (mixer: Mixer) => {
    set((state) => ({ mixers: [...state.mixers, mixer] }));
  },

  updateMixer: (id: string, updates: Partial<Mixer>) => {
    set((state) => ({
      mixers: state.mixers.map((mixer) =>
        mixer.id === id ? { ...mixer, ...updates } : mixer
      ),
    }));
  },

  getMixerById: (id: string) => {
    return get().mixers.find((mixer) => mixer.id === id);
  },

  getMyMixers: (groupIds: string[]) => {
    return get().mixers.filter(
      (mixer) =>
        groupIds.includes(mixer.groupAId) || groupIds.includes(mixer.groupBId)
    );
  },

  setRequests: (requests: MixerRequest[]) => {
    set({ requests });
  },

  addRequest: (request: MixerRequest) => {
    set((state) => ({ requests: [...state.requests, request] }));
  },

  updateRequestStatus: (id: string, status: MixerRequestStatus) => {
    set((state) => ({
      requests: state.requests.map((request) =>
        request.id === id
          ? { ...request, status, updatedAt: new Date().toISOString() }
          : request
      ),
    }));
  },

  getIncomingRequests: (groupIds: string[]) => {
    return get().requests.filter(
      (request) =>
        groupIds.includes(request.receivingGroupId) && request.status === 'pending'
    );
  },

  getOutgoingRequests: (groupIds: string[]) => {
    return get().requests.filter((request) =>
      groupIds.includes(request.requestingGroupId)
    );
  },
}));
