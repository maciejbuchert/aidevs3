import { ChatOpenAI } from '@langchain/openai';
import type { AgentPrompts } from '../interfaces/services/Agent/AgentPrompts';
import type { IState } from '../interfaces/services/Agent/IState';
import {HumanMessage, SystemMessage} from '@langchain/core/messages';
import * as fs from 'node:fs';
import type { Tool } from '../interfaces/services/Agent/Tool';

class Agent {
    private readonly prompts: AgentPrompts;
    private readonly tools: Record<string, Tool>;
    private readonly model: string;

    constructor(prompts: AgentPrompts, tools: Record<string, Tool>, model: string = 'gpt-4o-mini') {
        this.prompts = prompts;
        this.tools = tools;
        this.model = model;
    }

    public async process(message: HumanMessage) {
        fs.writeFileSync('log.md', '');

        const state: IState = {
          currentStage: 'init',
          currentStep: 1,
          maxSteps: 15,
          messages: [],
          systemPrompt: '',
          plan: '',
          actionsTaken: []
        };

        state.messages = [message];

        while (state.activeTool?.name !== 'final_answer' && state.currentStep <= state.maxSteps) {
            await this.plan(state);
            await this.decide(state);
            if (state.activeTool?.name === 'final_answer') {
                break;
            }
            await this.describe(state);
            await this.execute(state);
            await this.reflect(state);
            state.currentStep++;
        }

        state.systemPrompt = await this.getSystemPrompt('final_answer', state);
        const answer = await this.completion(state);

        this.logToMarkdown('result', 'Final Answer', `${JSON.stringify(answer)}`);

        return {
            choices: [
                {
                    message: {
                        role: 'assistant',
                        content: answer
                    }
                }
            ]
      };
    }

    private async plan(state: IState) {
        state.currentStage = 'plan';
        state.systemPrompt = await this.getSystemPrompt('plan', state);
        const plan = await this.completion(state);
        state.plan = plan!;
        this.logToMarkdown('basic', 'Planning', `Current plan: ${state.plan}`);
    }

    private async decide(state: IState) {
        state.currentStage = 'decide';
        state.systemPrompt = await this.getSystemPrompt('decide', state);

        const nextStep = await this.completion<{tool: string, _thoughts: string }>(state);

        console.log(nextStep);

        state.activeTool = {
            name: nextStep!.tool,
            description: this.tools[nextStep!.tool as keyof Tool].description,
            instruction: this.tools[nextStep!.tool as keyof Tool].instruction
        };
        this.logToMarkdown('action', 'Decision', `Next move: ${JSON.stringify(nextStep)}`);
    }

    private async describe(state: IState) {
        state.currentStage = 'describe';
        state.systemPrompt = await this.getSystemPrompt('describe', state);
        const nextStep = await this.completion(state);
        state.activeToolPayload = nextStep;
        this.logToMarkdown('action', 'Description', `Next step description: ${JSON.stringify(nextStep)}`);
    }

    private async execute(state: IState) {
        state.currentStage = 'execute';

        if (!state.activeTool) {
            throw new Error('No active tool to execute');
        }

        const result = await this.tools[state.activeTool?.name as keyof Tool].function(state.activeToolPayload);

        this.logToMarkdown('result', 'Execution', `Action result: ${JSON.stringify(result)}`);

        state.actionsTaken.push({
            name: state.activeTool?.name as string,
            payload: JSON.stringify(state.activeToolPayload),
            result: result,
            reflection: '',
            tool: state.activeTool.name
        });
    }

    private async reflect(state: IState) {
        state.currentStage = 'reflect';
        state.systemPrompt = await this.getSystemPrompt('reflect', state);
        const reflection = await this.completion(state);
        state.actionsTaken[state.actionsTaken.length - 1].reflection = reflection!;

        this.logToMarkdown('basic', 'Reflection', reflection!);
    }

    private async getSystemPrompt(type: 'plan' | 'decide' | 'describe' | 'reflect' | 'final_answer', state: IState): Promise<string> {
        return typeof this.prompts[type].systemPrompt === 'string' ? this.prompts[type].systemPrompt : await this.prompts[type].systemPrompt(state, this.tools);
    }

    private async completion<CompletionType = string>(state: IState) {
        try  {
            const openAi = new ChatOpenAI({ model: this.model });

            const messages = [
                new SystemMessage(state.systemPrompt),
                ...state.messages,
            ];

            const response = await openAi.invoke(messages);

            if (typeof response.content === 'string') {
                try {
                    return JSON.parse(response.content) as CompletionType;
                } catch (error) {
                    return response.content as CompletionType;
                }
            }
        } catch (err: unknown) {
            throw new Error(`Error: ${err}`);
        }
    }

    private logToMarkdown(type: string, header: string, content: string) {
        let formattedContent;

        switch(type) {
            case 'basic':
                formattedContent = `# ${header}\n${content}\n`;
                break;
            case 'action':
                formattedContent = `## ${header}\n${content}\n`;
                break;
            case 'result':
                formattedContent = `### ${header}\n\`\`\`\n${content}\n\`\`\`\n`;
                break;
            default:
                formattedContent = `${content}\n`;
        }

        fs.appendFileSync('log.md', formattedContent);
    }

}

export default Agent;
