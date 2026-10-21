/**
 * Choose the FK columns for a draft citation.
 *
 * A citation may reference a legacy knowledge source, a KMS document, or — most
 * commonly now — a document id that only exists inside the RAG service. RAG
 * returns its own internal ids alongside real KMS ids, and a single unknown id
 * used to abort the entire draft transaction. The copy is still grounded, so an
 * unknown source is stored as an unlinked citation instead of failing the save.
 */
export function citationSourceColumns(
  documentId: string,
  knowledgeSourceExists: boolean,
  assignedKmsDocumentExists: boolean,
  options: { allowUnlinked?: boolean } = {}
) {
  if (assignedKmsDocumentExists) return { sourceId: null as string | null, kmsDocumentId: documentId };
  if (knowledgeSourceExists) return { sourceId: documentId, kmsDocumentId: null as string | null };
  if (options.allowUnlinked) return { sourceId: null as string | null, kmsDocumentId: null as string | null };
  throw new Error('Citation source is not available in this workspace');
}
