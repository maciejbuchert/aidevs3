import type { IState } from "./IState";
import type {Tool} from "./Tool.ts";

export interface AgentPrompts {
    plan: {
        systemPrompt: SystemPrompt;
    },
    decide: {
        systemPrompt: SystemPrompt;
    },
    describe: {
        systemPrompt: SystemPrompt;
    },
    reflect: {
        systemPrompt: SystemPrompt;
    },
}

type SystemPrompt = string | ((state: IState, tools: Record<string, Tool>) => Promise<string>);
