import { DatabaseProvider } from '../../../../database/database.provider';
import { ParsedRow } from '../import-engine';

export interface DeployResult {
  success: boolean;
  inserted: number;
  failed: number;
  errors: { row: number; error: string }[];
  generatedPasswords?: { email: string; password: string }[];
}

export interface EntityDeployer {
  entityType: string;
  deploy(
    batchId: string,
    rows: ParsedRow[],
    columnMapping: Record<string, string>,
    db: DatabaseProvider,
    tenantId: string,
    branchId?: string,
  ): Promise<DeployResult>;
}

import { StudentDeployer } from './student.deployer';
import { UserDeployer } from './user.deployer';

const deployers: Map<string, EntityDeployer> = new Map();

export function registerDeployer(d: EntityDeployer) {
  deployers.set(d.entityType, d);
}

export function getDeployer(entityType: string): EntityDeployer {
  const d = deployers.get(entityType);
  if (!d)
    throw new Error(`No deployer registered for entity type: ${entityType}`);
  return d;
}

registerDeployer(new StudentDeployer());
registerDeployer(new UserDeployer());
