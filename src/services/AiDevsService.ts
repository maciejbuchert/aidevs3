import 'dotenv/config';
import type {TaskResponse} from "../interfaces/services/AiDevsService/TaskResponse.ts";
import got from 'got';

class AiDevsService {
    protected readonly baseUrl: string;
    protected readonly apiKey: string;

    constructor() {
        this.baseUrl = process.env.AIDEVS_HOST!;
        this.apiKey = process.env.AIDEVS_API_KEY!;
    }

    public async sendTask(task: string, answer: Record<any, any> | string | string[] | number | number[]): Promise<TaskResponse> {
        return await got.post('verify', {
            prefixUrl: this.baseUrl,
            json: {
                task,
                apikey: this.apiKey,
                answer
            },
        }).json<TaskResponse>();
    }
}

export default AiDevsService;
