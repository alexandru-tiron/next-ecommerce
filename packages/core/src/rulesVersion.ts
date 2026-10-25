// The version of firestore.rules and storage.rules. Each file says "Rules version N" near the top; bump this number and
// both markers together whenever the rules change, so Admin → dashboard can tell whether the deployed rules are current.
export const RULES_VERSION = 2;
export const RULES_VERSION_PATTERN = /Rules version (\d+)/;

export function rulesVersionOf(source: string): number | null {
   const match = source.match(RULES_VERSION_PATTERN);
   return match ? Number(match[1]) : null;
}
