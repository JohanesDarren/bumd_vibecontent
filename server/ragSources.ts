type SourceLike = { document_id?: unknown };

/**
 * Marks returned KMS sources as indexed. This is best-effort metadata only:
 * a failed update must never discard a valid grounded answer.
 */
export async function markSourcesIndexed(
  sources: SourceLike[],
  update: (ids: string[]) => Promise<unknown>,
  onError: (error: unknown) => void = () => {}
): Promise<boolean> {
  const ids = sources
    .map(source => source.document_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (!ids.length) return true;
  try {
    await update(ids);
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}
