import { ModuleCode } from "./catalog";
import { isSchoolModuleEnabled } from "./service";

export class ModuleDisabledError extends Error {
  constructor(code: ModuleCode) {
    super(`The ${code} module is disabled for this school.`);
    this.name = "ModuleDisabledError";
  }
}

export async function requireSchoolModule(schoolId: string, code: ModuleCode) {
  if (!(await isSchoolModuleEnabled(schoolId, code))) {
    throw new ModuleDisabledError(code);
  }
}
