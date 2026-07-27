import type { ID } from '@repo/types';
import type {
  Evidence,
  EvidenceListFilter,
  CreateEvidenceInput,
} from '@repo/types/validation';
import type { RawEvidenceSignal } from '@repo/types/evidence-engine';

/** Persists collected evidence — separate from interpretation. */
export interface EvidenceStore {
  saveFromSignals(
    projectId: ID,
    signals: RawEvidenceSignal[],
  ): Promise<Evidence[]>;
  create(input: CreateEvidenceInput): Promise<Evidence>;
  findById(id: ID): Promise<Evidence | null>;
  findByProjectId(
    projectId: ID,
    filter?: EvidenceListFilter,
  ): Promise<Evidence[]>;
}
