import { Scan, SelectDirectory } from '../../bindings/changeme/scannerservice';
import type { Endpoint } from '../../bindings/changeme/internal/models/models';

export async function scanEndpoints(directory: string): Promise<Endpoint[]> {
  return (await Scan(directory)) ?? [];
}

export async function pickDirectory(): Promise<string> {
  return SelectDirectory();
}
