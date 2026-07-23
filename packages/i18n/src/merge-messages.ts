type MessageNode = string | MessageTree;

type MessageTree = {
  [key: string]: MessageNode;
};

/** Deep-merge overlay onto base. Overlay values win; nested objects merge recursively. */
export function mergeMessages<T extends MessageTree>(base: T, overlay: Partial<T>): T {
  const result = { ...base } as T;

  for (const key of Object.keys(overlay) as Array<keyof T>) {
    const overlayValue = overlay[key];
    const baseValue = base[key];

    if (
      overlayValue &&
      typeof overlayValue === 'object' &&
      !Array.isArray(overlayValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = mergeMessages(
        baseValue as MessageTree,
        overlayValue as MessageTree,
      ) as T[keyof T];
    } else if (overlayValue !== undefined) {
      result[key] = overlayValue as T[keyof T];
    }
  }

  return result;
}

/** Humanize the last segment of a missing translation key. */
export function humanizeMessageKey(key: string): string {
  const leaf = key.split('.').pop() ?? key;
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
