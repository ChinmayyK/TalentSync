import { FieldMapping, MappingConfig } from '../types/mapping.interface';

/**
 * Apply field mappings to transform source object to target object
 */
export function applyMapping(
  source: Record<string, any>,
  mappingConfig: MappingConfig,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappingConfig.mappings) {
    const sourceValue = source[mapping.sourceField];

    if (sourceValue === undefined || sourceValue === null) {
      continue;
    }

    let transformedValue = sourceValue;

    // Apply transformation if specified
    if (mapping.transform && typeof sourceValue === 'string') {
      switch (mapping.transform) {
        case 'uppercase':
          transformedValue = sourceValue.toUpperCase();
          break;
        case 'lowercase':
          transformedValue = sourceValue.toLowerCase();
          break;
        case 'trim':
          transformedValue = sourceValue.trim();
          break;
        case 'none':
        default:
          transformedValue = sourceValue;
      }
    }

    result[mapping.targetField] = transformedValue;
  }

  return result;
}

/**
 * Reverse field mappings to transform target object back to source object
 */
export function reverseMapping(
  target: Record<string, any>,
  mappingConfig: MappingConfig,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappingConfig.mappings) {
    const targetValue = target[mapping.targetField];

    if (targetValue === undefined || targetValue === null) {
      continue;
    }

    // No transformation on reverse (transformations are one-way)
    result[mapping.sourceField] = targetValue;
  }

  return result;
}

/**
 * Merge two mapping configurations
 */
export function mergeMappings(
  existing: MappingConfig,
  updates: MappingConfig,
): MappingConfig {
  const mergedMappings = [...existing.mappings];

  for (const update of updates.mappings) {
    const existingIndex = mergedMappings.findIndex(
      (m) => m.sourceField === update.sourceField,
    );

    if (existingIndex >= 0) {
      mergedMappings[existingIndex] = update;
    } else {
      mergedMappings.push(update);
    }
  }

  return {
    mappings: mergedMappings,
    direction: updates.direction || existing.direction,
  };
}

/**
 * Validate mapping configuration
 */
export function validateMapping(mappingConfig: MappingConfig): boolean {
  if (!mappingConfig.mappings || !Array.isArray(mappingConfig.mappings)) {
    return false;
  }

  for (const mapping of mappingConfig.mappings) {
    if (!mapping.sourceField || !mapping.targetField) {
      return false;
    }
  }

  return true;
}
