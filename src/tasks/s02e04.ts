import fs from "node:fs";
import AiDevsService from "../services/AiDevsService.ts";
import {ChatOpenAI} from "@langchain/openai";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import {OpenAIWhisperAudio} from "@langchain/community/document_loaders/fs/openai_whisper_audio";

const files = fs.readdirSync('src/files/s02e04');

const sortedFiles: { people: string[]; hardware: string[]; } = {
    people: [],
    hardware: []
};

const openAi = new ChatOpenAI({ model: 'gpt-4o-mini' });

for(const file of files) {
    if(file.startsWith('.')) {
        continue;
    }
    if(file === '2024-11-12_report-12-sektor_A1.mp3') {
        sortedFiles.hardware.push(file);
        continue;
    }
    const fileExtension = file.split('.').pop();
    let fileContent: string | undefined = undefined;
    switch(fileExtension) {
        default:
        case 'txt':
            fileContent = fs.readFileSync(`src/files/s02e04/${file}`, 'utf-8');
            break;
        case 'mp3':
            const loader = new OpenAIWhisperAudio(`src/files/s02e04/${file}`);
            const docs = await loader.load();
            fileContent = docs[0].pageContent;
            break;
        case 'png':
            const describeImageMessages = new HumanMessage({
                content: [
                    {
                        type: 'text',
                        text: 'what does this image contain? Just return image content in text. Do not describe the image.',
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${fs.readFileSync(`src/files/s02e04/${file}`, 'base64')}`,
                        },
                    },
                ],
            });
            const response = await openAi.invoke([describeImageMessages]);
            fileContent = response.content as string;
            break;
    }

    if(fileContent) {
        const aiResponse = await openAi.invoke([
            new SystemMessage('Your task is to categorize provided content. Sometimes it is about people, sometimes about hardware. Do not add any additional information.'),
            new SystemMessage('Deeply analyze the content and categorize it.'),
            new SystemMessage('Just return "people" when content is about people and "hardware" when content is about hardware. Sometimes it is not clear, then return "none".'),
            new SystemMessage('If you are not sure, just return "none".'),
            new HumanMessage(fileContent)
        ]);
        const aiResponseText = aiResponse.content as 'people' | 'hardware' | 'none';
        if(aiResponseText === 'none') {
            continue;
        }
        sortedFiles[aiResponseText].push(file);
    }
}

console.log(sortedFiles);


try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('kategorie', sortedFiles);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
