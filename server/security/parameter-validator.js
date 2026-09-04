/**
 * WinSuite & MacSuite v6.3 - Parameter Validator
 * Strict input validation against command parameter schemas.
 * Disallows shell metacharacters and dangerous sequences.
 */

const DANGEROUS_CHAR_PATTERN = /[;&|`$><!\\(\)]/;

export function validateCommandParameters(spec, params = {}) {
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

  for (const key of Object.keys(params)) {
    if (!spec.parameterSchema[key]) {
      return { valid: false, error: `Unexpected parameter '${key}' is not allowed for this command.` };
    }
  }

  // Windows startup items are handled without shell interpolation. The item name
  // is validated above and is inserted only into quoted PowerShell literals.
  // Registry Run entries are disabled by renaming the value while preserving the
  // original command; scheduled tasks are disabled/enabled by task name.
  if (spec.platform === 'windows' && spec.bin === 'powershell' && params.itemName !== undefined && params.enable !== undefined) {
    const itemName = params.itemName.replace(/'/g, "''");
    const script = params.enable
      ? `$run='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; if (Test-Path $run) { $p=Get-ItemProperty -Path $run -ErrorAction SilentlyContinue; $disabled='Disabled_'+${JSON.stringify(params.itemName)}; if ($p.PSObject.Properties.Name -contains $disabled) { Rename-ItemProperty -Path $run -Name $disabled -NewName ${JSON.stringify(params.itemName)} -ErrorAction Stop } }; Get-ScheduledTask -TaskName '${itemName}' -ErrorAction SilentlyContinue | Enable-ScheduledTask -ErrorAction SilentlyContinue; Write-Output 'Startup item enabled.'`
      : `$run='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; if (Test-Path $run) { $p=Get-ItemProperty -Path $run -ErrorAction SilentlyContinue; if ($p.PSObject.Properties.Name -contains '${itemName}') { Rename-ItemProperty -Path $run -Name '${itemName}' -NewName 'Disabled_${itemName}' -ErrorAction Stop } }; Get-ScheduledTask -TaskName '${itemName}' -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue; Write-Output 'Startup item disabled.'`;
    sanitizedArgs.push(script);
  } else if (spec.bin === 'powershell' && params.serviceName && params.action) {
    const serviceName = params.serviceName.replace(/'/g, "''");
    sanitizedArgs.push(`${params.action} -Name \"${serviceName}\"`);
  } else if (spec.bin === 'powershell' && params.itemName !== undefined && params.enable !== undefined) {
    sanitizedArgs.push(`Write-Output \"${params.enable ? 'Enabled' : 'Disabled'} startup item ${params.itemName}\"`);
  }

  return { valid: true, sanitizedArgs };
}
