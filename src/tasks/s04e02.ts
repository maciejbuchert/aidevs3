import AiDevsService from "../services/AiDevsService.ts";


const data: string[] = [];

try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('research', data);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
