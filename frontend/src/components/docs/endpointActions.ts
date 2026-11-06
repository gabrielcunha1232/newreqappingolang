/** O que se pode fazer com um endpoint da documentação (botões e clique direito). */
export interface EndpointActions {
  /** Abre a requisição do endpoint no editor. */
  tryIt: (requestId: string) => void;
  copyCurl: (requestId: string) => void;
  copyText: (text: string, label: string) => void;
}
