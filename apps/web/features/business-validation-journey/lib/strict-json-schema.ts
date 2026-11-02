export type StrictSchemaIssue = {
  path: string;
  issue: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * OpenAI strict json_schema rejects an object whose properties are not all listed in required.
 * Nullable fields stay required and use a null type. This does not call a provider.
 */
export function strictSchemaIssues(schema: unknown, path = '$'): StrictSchemaIssue[] {
  if (!isRecord(schema)) return [];
  const issues: StrictSchemaIssue[] = [];
  const properties = schema.properties;
  const type = schema.type;
  const objectType = type === 'object' || (Array.isArray(type) && type.includes('object'));
  if (objectType && !isRecord(properties)) {
    issues.push({ path, issue: 'object_properties_missing' });
  }
  if (isRecord(properties)) {
    const keys = Object.keys(properties);
    const required = schema.required;
    if (!Array.isArray(required) || required.some((item) => typeof item !== 'string')) {
      issues.push({ path, issue: 'required_missing' });
    } else {
      for (const key of keys) {
        if (!required.includes(key)) issues.push({ path, issue: `property_not_required:${key}` });
      }
      for (const key of required) {
        if (!keys.includes(key)) issues.push({ path, issue: `required_not_in_properties:${key}` });
      }
    }
    if (schema.additionalProperties !== false) {
      issues.push({ path, issue: 'additional_properties_not_false' });
    }
    for (const key of keys) {
      issues.push(...strictSchemaIssues(properties[key], `${path}.properties.${key}`));
    }
  }
  if ('items' in schema) issues.push(...strictSchemaIssues(schema.items, `${path}.items`));
  for (const combiner of ['anyOf', 'oneOf', 'allOf'] as const) {
    const list = schema[combiner];
    if (!Array.isArray(list)) continue;
    list.forEach((item, index) => {
      issues.push(...strictSchemaIssues(item, `${path}.${combiner}[${index}]`));
    });
  }
  return issues;
}
