import { getSkillAgentTypes, isSkillAgentType, type SkillAgentType } from "../../skill/index.ts";

export const parseSkillAgentList = (input: string[] | undefined): SkillAgentType[] | undefined => {
  if (!input || input.length === 0) return undefined;
  if (input.includes("*")) return getSkillAgentTypes();

  const validated: SkillAgentType[] = [];
  for (const value of input) {
    if (!isSkillAgentType(value)) throw new Error(`Unknown agent "${value}"`);
    validated.push(value);
  }
  return validated;
};
