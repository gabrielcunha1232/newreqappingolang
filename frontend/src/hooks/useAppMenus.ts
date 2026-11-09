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
  /** Documentação da coleção da requisição ativa. */
  onShowDocs: () => void;
  onImportSpec: () => void;
  onImportCurl: () => void;
  onImportCollection: () => void;
  /** Gera código da requisição ativa. */
  onGenerateCode: () => void;
  /** Copia a requisição ativa como cURL. */
  onCopyCurl: () => void;
  onExportBackup: () => void;
  onRestoreBackup: () => void;
  onGlobalSearch: () => void;
  onHelp: (topic?: string) => void;
  onCompareEnvironments: () => void;
  onAppearance: () => void;
}

export const GLOBAL_SEARCH_LABEL = 'Busca global';

/** Itens da barra de menus (Arquivo, Editar, Visualizar, Janela, Ajuda). */
export function useAppMenus({ workspace, dock, logger, toast, onShowSidebar, onShowDocs, onImportSpec, onImportCurl, onImportCollection, onGenerateCode, onCopyCurl, onExportBackup, onRestoreBackup, onGlobalSearch, onHelp, onCompareEnvironments, onAppearance }: Deps): MenuDefinition[] {
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
        { label: 'Importar OpenAPI / Swagger…', onSelect: onImportSpec },
        { label: 'Importar cURL…', onSelect: onImportCurl },
        { label: 'Importar Postman / Insomnia…', onSelect: onImportCollection },
        'separator',
        { label: 'Fazer backup', onSelect: onExportBackup },
        { label: 'Restaurar backup…', onSelect: onRestoreBackup },
        'separator',
        { label: 'Fechar aba', shortcut: 'Ctrl+W', onSelect: actions.closeActiveTab },
      ],
    },
    {
      label: 'Editar',
      items: [
        { label: GLOBAL_SEARCH_LABEL, shortcut: 'Ctrl+K', onSelect: onGlobalSearch },
        { label: 'Duplicar requisição', onSelect: () => activeId && actions.duplicateRequest(activeId) },
        { label: 'Copiar como cURL', onSelect: onCopyCurl },
        { label: 'Gerar código…', onSelect: onGenerateCode },
        { label: 'Comparar ambientes…', onSelect: onCompareEnvironments },
        { label: 'Limpar console', onSelect: logger.clear },
      ],
    },
    {
      label: 'Visualizar',
      items: [
        { label: 'Tema…', onSelect: onAppearance },
        'separator',
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
        'separator',
        { label: 'Documentação da API', onSelect: onShowDocs },
      ],
    },
    {
      label: 'Ajuda',
      items: [
        { label: 'Guia de funcionalidades', shortcut: 'F1', onSelect: () => onHelp() },
        { label: 'Atalhos de teclado', onSelect: () => onHelp('atalhos') },
        {
          label: 'Sobre o Forkarsenet',
          onSelect: () => toast.show('Forkarsenet — cliente HTTP em Go + Wails.'),
        },
      ],
    },
  ];
}
