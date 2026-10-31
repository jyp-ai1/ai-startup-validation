/**
 * A review attaches to a workspace only when one owned project has that body.
 * Zero matches and two or more matches stay unattached.
 */
export function soleOwnedProjectId(
  inputSha: string,
  owned: Array<{ projectId: string; inputSha: string }>,
): string | null {
  const ids = [...new Set(owned.filter((item) => item.inputSha === inputSha).map((item) => item.projectId))];
  return ids.length === 1 ? ids[0] ?? null : null;
}

export function projectLinksForUnscopedReviews(
  reviews: Array<{ reviewId: string; inputSha: string; projectId: string | null }>,
  owned: Array<{ projectId: string; inputSha: string }>,
): Array<{ reviewId: string; projectId: string }> {
  const links: Array<{ reviewId: string; projectId: string }> = [];
  for (const review of reviews) {
    if (review.projectId) continue;
    const projectId = soleOwnedProjectId(review.inputSha, owned);
    if (projectId) links.push({ reviewId: review.reviewId, projectId });
  }
  return links;
}
