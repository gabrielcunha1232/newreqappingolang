import type { Response } from '../bindings/changeme/internal/models/models';

export interface Tab {
  id: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  response: Response | null;
  error: string;
  loading: boolean;
  title: string;
}
