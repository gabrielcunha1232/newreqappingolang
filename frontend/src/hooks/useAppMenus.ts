import { PRESET_LABELS, type LayoutPreset } from '../lib/dockLayout';
import { MAIN_PANELS, PANEL_TITLES, REQUEST_PARTS } from '../lib/panels';
import type { MenuDefinition, MenuEntry, SidebarView } from '../types';
import type { useConsole } from './useConsole';
import type { DockLayout } from './useDockLayout';
import type { useToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  dock: DockLayout;
  logger: ReturnType<typeof useConsole>;
  toast: ReturnType<typeof useToast>;
  onShowSidebar: (view: SidebarView) => void;
}

/** Itens da barra de menus (Arquivo, Editar, Visualizar, Janela, Ajuda). */
export function useAppMenus({ workspace, dock, logger, toast, onShowSidebar }: Deps): MenuDefinition[] {
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
        ...MAIN_PANELS.map(
          (id): MenuEntry => ({
            label: `Painel ${PANEL_TITLES[id]}`,
            checked: dock.openPanels.includes(id),
            onSelect: () => dock.actions.toggle(id),
          })
        ),
        'separator',
        ...REQUEST_PARTS.map(
          (part): MenuEntry => ({
            label: `${PANEL_TITLES[part]} em painel próprio`,
            checked: dock.detachedParts.includes(part),
            onSelect: () => dock.actions.toggle(part),
          })
        ),
        'separator',
        ...(Object.keys(PRESET_LABELS) as LayoutPreset[]).map(
          (preset): MenuEntry => ({
            label: `Layout: ${PRESET_LABELS[preset]}`,
            onSelect: () => {
              dock.actions.applyPreset(preset);
              toast.show(`Layout "${PRESET_LABELS[preset]}" aplicado.`);
            },
          })
        ),
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
