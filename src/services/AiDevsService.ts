import 'dotenv/config';
import type {TaskResponse} from "../interfaces/services/AiDevsService/TaskResponse.ts";
import got, { HTTPError } from 'got';

class AiDevsService {
    protected readonly baseUrl: string;
    protected readonly apiKey: string;

    constructor() {
        this.baseUrl = process.env.AIDEVS_HOST!;
        this.apiKey = process.env.AIDEVS_API_KEY!;
    }

    public async sendTask(task: string, answer: Record<any, any> | string | string[] | number | number[]) {
        try {
            return await got.post('report', {
                prefixUrl: this.baseUrl,
                json: {
                    task,
                    apikey: this.apiKey,
                    answer
                },
            });
        } catch(e: any) {
            if(e instanceof HTTPError) {
                if(typeof e.response.body === 'string') {
                    throw new Error(JSON.parse(e.response.body).message);
                } else {
                    throw new Error(e.response.body.message);
                }
            }
        }
    }
}

export default AiDevsService;
