// noinspection JSJQueryEfficiency

import * as cheerio from 'cheerio';
import got from "got";
import {ChatOpenAI} from "@langchain/openai";
import {NodeHtmlMarkdown} from "node-html-markdown";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import {OpenAIWhisperAudio} from "@langchain/community/document_loaders/fs/openai_whisper_audio";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import AiDevsService from "../services/AiDevsService.ts";
import QdrantVectorDb from "../services/QdrantVectorDb.ts";

const openAi = new ChatOpenAI({ model: 'gpt-4o-mini' });
const collection = `s02e05_collection`;
const client = new QdrantVectorDb(collection);

console.log('Retrieving article content...');
const articleUrl = 'https://centrala.ag3nts.org/dane/arxiv-draft.html';
const article = await got.get(articleUrl).text();

console.log('Processing article content...');
const $ = cheerio.load(article);
const articleLead = $('div#abstract').text().replace(/\s+/g, ' ').trim();
const articleTitle = $('h1.title').text().replace(/\s+/g, ' ').trim();
const articleAuthors = $('div.authors').text().replace(/\s+/g, ' ').trim().split(',').map((author) => author.trim());

const articleContent = $('div.container');
$(articleContent).find('h1.title').remove();
$(articleContent).find('div.authors').remove();
$(articleContent).find('h2').first().remove();
$(articleContent).find('h2').last().remove();
$(articleContent).find('div#abstract').remove();
$(articleContent).find('img').remove();
$(articleContent).find('audio').remove();
$(articleContent).find('a').remove();
$(articleContent).find('div.chicago-bibliography').remove();

const htmlToMarkdown = new NodeHtmlMarkdown();
const articleContentText = htmlToMarkdown.translate($(articleContent).html()!);

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

const allSplits = await splitter.splitDocuments([{
    pageContent: articleContentText,
    metadata: {},
}])

const imageUrls = $(articleContent).find('img').map((index, img) => `https://centrala.ag3nts.org/dane/${$(img).attr('src')}`).get();
const imageDescriptions: string[] = [];

for(const imageUrl of imageUrls) {
    const image = await got.get(imageUrl).buffer();
    const imageBase64 = image.toString('base64');

    const describeImageMessages = new HumanMessage({
        content: [
            {
                type: 'text',
                text: 'what does this image contain?',
            },
            {
                type: 'image_url',
                image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                },
            },
        ],
    });
    const response = await openAi.invoke([describeImageMessages]);
    imageDescriptions.push(response.content as string);
}

const audioUrls = $(articleContent).find('audio').map((index, audio) => `https://centrala.ag3nts.org/dane/${$(audio).find('source').attr('src')}`).get();

const audioContents: string[] = [];
for(const audioUrl of audioUrls) {
    const loader = new OpenAIWhisperAudio(audioUrl);
    const docs = await loader.load();
    audioContents.push(docs[0].pageContent);
}

console.log('Embedding content...');
await client.addDocumentToStore({
    pageContent: articleTitle,
    metadata: {},
});
await client.addDocumentToStore({
    pageContent: articleLead,
    metadata: {},
});
await client.addDocumentToStore({
    pageContent: articleAuthors.join(' '),
    metadata: {},
});
await client.addDocumentsToStore(allSplits);

console.log('Embedding images...');
await client.addDocumentsToStore(imageDescriptions.map((imageDescription) => {
    return {
        pageContent: imageDescription,
        metadata: {},
    }
}));

console.log('Embedding audio...');
await client.addDocumentsToStore(audioContents.map((audioTranscription) => {
    return {
        pageContent: audioTranscription,
        metadata: {},
    }
}));

const questionsUrl = `https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY}/arxiv.txt`
const questionsString = await got.get(questionsUrl).text();
const questions = questionsString.split('\n').map((line) => line.trim()).filter((line) => line.length > 0).map((line) => {
    const question = line.split('=');
    return {
        id: question[0],
        question: question[1],
    }
});

const answers: Record<string, string> = {
};

for(const question of questions) {
    if(!answers[question.id]) {
        const aiQuery = await openAi.invoke([
            new SystemMessage('Your task is to make a query to VectorDB to retrieve the most relevant content for the question.'),
            new SystemMessage('Deeply analyze the content and answer the question.'),
            new SystemMessage(`Answer shortly.`),
            new HumanMessage(question.question),
        ]);

        const query = aiQuery.content as string;
        const documents = await client.searchStore(query, 5);

        const aiResponse = await openAi.invoke([
            new SystemMessage('Your task is to answer the question based on the retrieved content.'),
            new SystemMessage('Deeply analyze the content and answer the question.'),
            new SystemMessage(`<content>${JSON.stringify(documents)}</content>`),
            new SystemMessage(`Answer shortly.`),
            new HumanMessage(question.question),
        ]);

        const response = aiResponse.content as string;
        console.log(aiResponse.content as string);

        answers[question.id] = response;
    }
}

console.log(answers);

try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('arxiv', answers);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
