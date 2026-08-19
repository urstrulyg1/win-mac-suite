/**
 * WinSuite & MacSuite v6.3 - Parameter Validator
 * Strict input validation against command parameter schemas.
 * Disallows shell metacharacters and dangerous sequences.
 */

const DANGEROUS_CHAR_PATTERN = /[;&|`$><!\\(\)]/;

/**
 * Validates parameters against a command definition's parameterSchema.
 * @param {Object} spec - Command specification from COMMAND_ALLOWLIST
 * @param {Object} params - User-supplied parameters
 * @returns {{ valid: boolean, error?: string, sanitizedArgs?: string[] }}
 */
export function validateCommandParameters(spec, params = {}) {
  // If no schema is defined, no parameters should be passed (or only empty object)
  if (!spec.parameterSchema) {
    if (Object.keys(params).length > 0) {
      return { valid: false, error: `Command '${spec.bin}' does not accept custom parameters.` };
    }
    return { valid: true, sanitizedArgs: spec.fixedArgs || [] };
  }

  const sanitizedArgs = [...(spec.fixedArgs || [])];

  for (const [key, rules] of Object.entries(spec.parameterSchema)) {
    const val = params[key];

    if (val === undefined || val === null) {
      if (rules.required !== false) {
        return { valid: false, error: `Missing required parameter: '${key}'.` };
      }
      continue;
    }

    if (rules.type === 'string') {
      if (typeof val !== 'string') {
        return { valid: false, error: `Parameter '${key}' must be a string.` };
      }
      if (DANGEROUS_CHAR_PATTERN.test(val)) {
        return { valid: false, error: `Parameter '${key}' contains forbidden shell characters.` };
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(val)) {
        return { valid: false, error: `Parameter '${key}' does not match permitted pattern.` };
      }
    } else if (rules.type === 'enum') {
      if (!rules.values.includes(val)) {
        return { valid: false, error: `Parameter '${key}' must be one of: [${rules.values.join(', ')}].` };
      }
    } else if (rules.type === 'boolean') {
      if (typeof val !== 'boolean') {
        return { valid: false, error: `Parameter '${key}' must be a boolean.` };
      }
    } else if (rules.type === 'number') {
      if (typeof val !== 'number' || isNaN(val)) {
        return { valid: false, error: `Parameter '${key}' must be a valid number.` };
      }
    }
  }

  // Check for any unexpected parameters
  for (const key of Object.keys(params)) {
    if (!spec.parameterSchema[key]) {
      return { valid: false, error: `Unexpected parameter '${key}' is not allowed for this command.` };
    }
  }

  // Construct structured arguments based on command specifics if parameterized
  if (spec.bin === 'powershell' && params.serviceName && params.action) {
    sanitizedArgs.push(`${params.action} -Name "${params.serviceName}"`);
  } else if (spec.bin === 'powershell' && params.itemName !== undefined && params.enable !== undefined) {
    if (params.enable) {
      sanitizedArgs.push(`Write-Output "Enabled startup item ${params.itemName}"`);
    } else {
      sanitizedArgs.push(`Write-Output "Disabled startup item ${params.itemName}"`);
    }
  }

  return { valid: true, sanitizedArgs };
}
