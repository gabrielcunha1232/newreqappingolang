import type { MenuDefinition, PanelId, SidebarView } from '../types';
import type { useConsole } from './useConsole';
import type { usePanelLayout } from './usePanelLayout';
import type { useToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

const PANEL_LABELS: Record<PanelId, string> = {
  request: 'Requisição',
  env: 'Ambiente',
  response: 'Resposta',
  console: 'Console',
};

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  panels: ReturnType<typeof usePanelLayout>;
  logger: ReturnType<typeof useConsole>;
  toast: ReturnType<typeof useToast>;
  onShowSidebar: (view: SidebarView) => void;
}

/** Itens da barra de menus (Arquivo, Editar, Visualizar, Janela, Ajuda). */
export function useAppMenus({ workspace, panels, logger, toast, onShowSidebar }: Deps): MenuDefinition[] {
  const { state, actions } = workspace;
  const activeId = state.activeRequestId;

  return [
    {
      label: 'Arquivo',
      items: [
        { label: 'Nova requisição', shortcut: 'Ctrl+T', onSelect: () => actions.createRequest() },
        {
          label: 'Nova coleção',
          onSelect: () => {
            actions.createCollection('Nova coleção');
            onShowSidebar('collections');
            toast.show('Coleção criada. Dê um duplo clique no nome para renomear.');
          },
        },
        'separator',
        { label: 'Fechar aba', shortcut: 'Ctrl+W', onSelect: () => activeId && actions.closeTab(activeId) },
      ],
    },
    {
      label: 'Editar',
      items: [
        { label: 'Duplicar requisição', onSelect: () => activeId && actions.duplicateRequest(activeId) },
        { label: 'Limpar console', onSelect: logger.clear },
      ],
    },
    {
      label: 'Visualizar',
      items: [
        ...(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => {
          const visible = !panels.layout.hidden.includes(id);
          return {
            label: `Painel ${PANEL_LABELS[id]}`,
            checked: visible,
            onSelect: () => panels.actions.setVisible(id, !visible),
          };
        }),
        'separator' as const,
        {
          label: 'Restaurar layout',
          onSelect: () => {
            panels.actions.reset();
            toast.show('Layout restaurado.');
          },
        },
      ],
    },
    {
      label: 'Janela',
      items: [
        { label: 'Coleções', onSelect: () => onShowSidebar('collections') },
        { label: 'Histórico', onSelect: () => onShowSidebar('history') },
        { label: 'APIs (scanner)', onSelect: () => onShowSidebar('apis') },
      ],
    },
    {
      label: 'Ajuda',
      items: [
        {
          label: 'Atalhos de teclado',
          onSelect: () => toast.show('Ctrl+T nova aba · Ctrl+W fecha aba · Ctrl+Enter envia'),
        },
        {
          label: 'Sobre o NewPostman',
          onSelect: () => toast.show('NewPostman — cliente HTTP em Go + Wails.'),
        },
      ],
    },
  ];
}
