import { create } from 'zustand';

export interface DomainInfo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  standardCount: number;
  assetCount: number;
  taskCount: number;
}

interface ApiDomain {
  id: string;
  name: string;
  description: string | null;
  status: string;
  standardsCount: number;
  assetsCount: number;
  tasksCount: number;
  created_at: string;
  updated_at: string;
}

function toDomainInfo(raw: ApiDomain): DomainInfo {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    standardCount: raw.standardsCount ?? 0,
    assetCount: raw.assetsCount ?? 0,
    taskCount: raw.tasksCount ?? 0,
  };
}

const CURRENT_DOMAIN_KEY = 'currentDomainId';

interface DomainState {
  domains: DomainInfo[];
  currentDomain: DomainInfo | null;
  loading: boolean;
  loadDomains: () => Promise<void>;
  setCurrentDomain: (domain: DomainInfo) => void;
  createDomain: (name: string, description?: string) => Promise<DomainInfo | null>;
  updateDomain: (id: string, data: { name?: string; description?: string }) => Promise<DomainInfo | null>;
  deleteDomain: (id: string) => Promise<void>;
}

export const useDomainStore = create<DomainState>((set, get) => ({
  domains: [],
  currentDomain: null,
  loading: false,

  loadDomains: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/domains');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const domains = json.data.map(toDomainInfo);
        set({ domains, loading: false });

        // Restore current domain from localStorage
        const savedId = localStorage.getItem(CURRENT_DOMAIN_KEY);
        if (savedId) {
          const matched = domains.find((d: DomainInfo) => d.id === savedId);
          if (matched) {
            set({ currentDomain: matched });
          }
        } else if (domains.length === 1) {
          // Auto-select if only one domain exists
          set({ currentDomain: domains[0] });
          localStorage.setItem(CURRENT_DOMAIN_KEY, domains[0].id);
        }
      } else {
        set({ domains: [], loading: false });
      }
    } catch {
      set({ domains: [], loading: false });
    }
  },

  setCurrentDomain: (domain: DomainInfo) => {
    localStorage.setItem(CURRENT_DOMAIN_KEY, domain.id);
    set({ currentDomain: domain });
  },

  createDomain: async (name: string, description?: string) => {
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const json = await res.json();
      if (json.success) {
        const newDomain = toDomainInfo(json.data);
        set((state) => {
          const updated = [...state.domains, newDomain];
          return { domains: updated, currentDomain: state.currentDomain ?? newDomain };
        });
        localStorage.setItem(CURRENT_DOMAIN_KEY, newDomain.id);
        return newDomain;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateDomain: async (id: string, data: { name?: string; description?: string }) => {
    try {
      const res = await fetch(`/api/domains/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        const updated = toDomainInfo(json.data);
        set((state) => {
          const domains = state.domains.map((d) => (d.id === id ? { ...d, ...updated } : d));
          const currentDomain =
            state.currentDomain?.id === id ? { ...state.currentDomain, ...updated } : state.currentDomain;
          return { domains, currentDomain };
        });
        return updated;
      }
      return null;
    } catch {
      return null;
    }
  },

  deleteDomain: async (id: string) => {
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        set((state) => {
          const domains = state.domains.filter((d) => d.id !== id);
          const currentDomain = state.currentDomain?.id === id ? (domains[0] ?? null) : state.currentDomain;
          if (currentDomain) {
            localStorage.setItem(CURRENT_DOMAIN_KEY, currentDomain.id);
          } else {
            localStorage.removeItem(CURRENT_DOMAIN_KEY);
          }
          return { domains, currentDomain };
        });
      }
    } catch {
      // silently fail
    }
  },
}));
