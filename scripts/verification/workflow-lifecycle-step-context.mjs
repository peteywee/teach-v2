// GitHub exposes generated service-setup context IDs in addition to user steps.
// These are not executable declarations. Actual runner setup is independently
// checked against GitHub job names/status during authoritative receipt readback.
export function declaredStepContext(steps, definition) {
  if (!steps || typeof steps !== 'object' || Array.isArray(steps)) throw new TypeError('step context object required');
  const declared = new Set(definition.required_steps);
  const result = {};
  for (const [id,observed] of Object.entries(steps)) {
    if (!declared.has(id) && definition.has_service_setup === true && /^[a-f0-9]{32}$/.test(id) && observed?.outcome === 'success' && observed?.conclusion === 'success') continue;
    result[id] = observed;
  }
  return result;
}
