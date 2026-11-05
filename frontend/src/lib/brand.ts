/**
 * Ícones da marca (public/forkarsenet-brand-kit). Em tamanhos pequenos usamos
 * os PNGs exportados: o LEIA-ME avisa que o SVG ainda precisa de revisão
 * para tamanhos muito pequenos.
 */
const KIT = '/forkarsenet-brand-kit';

export const BRAND_ICON = {
  /** Até ~16px (topbar). */
  small: `${KIT}/forkarsenet-32.png`,
  /** Até ~32px (logo da sidebar), com folga para telas de alta densidade. */
  medium: `${KIT}/forkarsenet-64.png`,
  /** Usos grandes (ex.: tela "Sobre"). */
  vector: `${KIT}/forkarsenet.svg`,
};
