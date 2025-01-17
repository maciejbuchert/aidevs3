import {BaseMessage} from "@langchain/core/messages";

export type Stage = 'init' | 'plan' | 'decide' | 'describe' | 'reflect' | 'execute' | 'final';

export interface ITool {
    name: string;
    instruction: string;
    description: string;
}

export interface IAction {
    name: string;
    payload: string;
    result: string;
    reflection: string;
    tool: string;
}

export interface IState {
    systemPrompt: string;
    messages: BaseMessage[];

    currentStage: Stage;
    currentStep: number;
    maxSteps: number;

    activeTool?: ITool;
    activeToolPayload?: any;

    plan: string;
    actionsTaken: IAction[];
}