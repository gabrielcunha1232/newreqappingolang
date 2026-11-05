import { useCallback, useMemo, useState } from 'react';
import { defaultEnvironments } from '../lib/factories';
import { generateId } from '../lib/id';
import { variablesToMap } from '../lib/variables';
import type { Environment, KeyValue } from '../types';

export function useEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>(defaultEnvironments);
  const [activeId, setActiveId] = useState<string | null>(() => environments[0]?.id ?? null);

  const active = environments.find((e) => e.id === activeId) ?? null;
  const variables = useMemo(() => variablesToMap(active?.variables ?? []), [active]);

  const hydrate = useCallback((list: Environment[], id: string | null) => {
    const next = list.length > 0 ? list : defaultEnvironments();
    setEnvironments(next);
    setActiveId(id && next.some((e) => e.id === id) ? id : next[0]?.id ?? null);
  }, []);

  const create = useCallback((name: string) => {
    const env: Environment = { id: generateId(), name: name.trim() || 'Novo ambiente', variables: [] };
    setEnvironments((prev) => [...prev, env]);
    setActiveId(env.id);
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEnvironments((prev) => prev.map((e) => (e.id === id ? { ...e, name: trimmed } : e)));
  }, []);

  const remove = useCallback((id: string) => {
    setEnvironments((prev) => prev.filter((e) => e.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const setVariables = useCallback((id: string, variables: KeyValue[]) => {
    setEnvironments((prev) => prev.map((e) => (e.id === id ? { ...e, variables } : e)));
  }, []);

  return {
    environments,
    activeId,
    active,
    variables,
    actions: { hydrate, select: setActiveId, create, rename, remove, setVariables },
  };
}

export type EnvironmentActions = ReturnType<typeof useEnvironments>['actions'];
