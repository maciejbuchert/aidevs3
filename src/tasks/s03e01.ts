import fs from "node:fs";
import {ChatOpenAI} from "@langchain/openai";
import AiDevsService from "../services/AiDevsService.ts";
import QdrantVectorDb from "../services/QdrantVectorDb.ts";
import type { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";

const qdrantCollectionName = `s03e01_${new Date().getTime()}`;
const qdrantVectorDb = new QdrantVectorDb(qdrantCollectionName);

const embedFile = async (fileName: string) => {
    const itemExtension = fileName.split('.').pop();

    switch (itemExtension) {
        case 'txt':
            const pageContent = fs.readFileSync(`src/files/s03e01/${fileName}`, 'utf-8');

            const document: Document = {
                pageContent,
                metadata: {},
            };

            await qdrantVectorDb.addDocumentToStore(document);
            break;
        case undefined:
            embedFile(fileName);
    }
}

const taskDocumentsDirectory = fs.readdirSync('src/files/s03e01');
for(const item of taskDocumentsDirectory) {
    await embedFile(item);
}

const openAi = new ChatOpenAI({ model: 'gpt-4o-mini' });

const answerPrompt = PromptTemplate.fromTemplate(
    `<document>
    {{document}}
    </document>
    
    <context>
    {{context}}
    </context>

    Generate at least 10 tags for the provided report, considering the context from 
    facts about the person (if provided) – who they are, what they specifically do, where they live, and other relevant details
    Tags should be separated by commas, without adding the '#' symbol before them.
    The first tag MUST be the sector/department name extracted from the file name in the format: 'sector X1', 'sector X2', etc.

    <example_output>cat,dog,animal</example_output>`,
);

const keywords: Record<string, string> = {};
for(const file of taskDocumentsDirectory) {
    if(!file.endsWith('.txt')) {
        continue;
    }

    const docContent = fs.readFileSync(`src/files/s03e01/${file}`, 'utf-8');
    const context = await qdrantVectorDb.searchStore(docContent, 5);
    const formattedPrompt = await answerPrompt.invoke({
        context,
        document: docContent,
    });

    const aiResponse = await openAi.invoke(formattedPrompt);
    keywords[file] = aiResponse.content as string;

}

console.log(keywords);

try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('dokumenty', keywords);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
