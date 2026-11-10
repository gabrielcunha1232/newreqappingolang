export interface EndpointActions {
  tryIt: (requestId: string) => void;
  copyCurl: (requestId: string) => void;
  copyText: (text: string, label: string) => void;
}
