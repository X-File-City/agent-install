import { listAgentsMdDescriptors, type AgentsMdAgent } from "../../../agents-md/index.ts";

const knownAgents: ReadonlySet<string> = new Set(
  listAgentsMdDescriptors().map((descriptor) => descriptor.agent),
);

export const isAgentsMdAgent = (value: string): value is AgentsMdAgent => knownAgents.has(value);

export const resolveAgentsMdAgent = (value: string | undefined): AgentsMdAgent | undefined => {
  if (value === undefined) return undefined;
  if (!isAgentsMdAgent(value)) {
    throw new Error(`Unknown agent "${value}"`);
  }
  return value;
};
