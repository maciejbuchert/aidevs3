// noinspection JSJQueryEfficiency

import * as cheerio from 'cheerio';
import got from "got";
import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import {NodeHtmlMarkdown} from "node-html-markdown";
import {HumanMessage} from "@langchain/core/messages";
import {OpenAIWhisperAudio} from "@langchain/community/document_loaders/fs/openai_whisper_audio";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";

const openAi = new ChatOpenAI({ model: 'gpt-4o-mini' });
const client = new QdrantClient({ host: "localhost", port: 6333 });
const collection = `s02e05_collection_${new Date().getTime()}`;
await client.createCollection(collection, {
    vectors: { size: 1500, distance: "Dot" },
});

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
const embeddingModel = new OpenAIEmbeddings();

console.log([
    {
        id: 1,
        vector: await embeddingModel.embedQuery(articleTitle),
        payload: { title: articleTitle },
    },
    {
        id: 2,
        vector: await embeddingModel.embedQuery(articleAuthors.join(' ')),
        payload: { authors: articleAuthors.join(' ') },
    },
]);

const operationInfo = await client.upsert(collection, {
    wait: true,
    points: [
        {
            id: 1,
            vector: await embeddingModel.embedQuery(articleTitle),
            payload: { title: articleTitle },
        },
        {
            id: 2,
            vector: await embeddingModel.embedQuery(articleAuthors.join(' ')),
            payload: { authors: articleAuthors.join(' ') },
        },
    ],
});

// let i = 2;
//
// for(const split of allSplits) {
//     const operationInfo = await client.upsert(collection, {
//         wait: true,
//         points: [
//             {
//                 id: i++,
//                 vector: await embeddingModel.embedQuery(split.pageContent),
//                 payload: { pageContent: split.pageContent },
//             }
//         ],
//     });
// }

// console.log('Embedding images...');
// for(const imageDescription of imageDescriptions) {
//     points.push({
//         id: points.length,
//         vector: await embeddingModel.embedQuery(imageDescription),
//         payload: { image: imageDescription},
//     });
// }
//
// console.log('Embedding audio...');
// for(const audioContent of audioContents) {
//     points.push({
//         id: points.length,
//         vector: await embeddingModel.embedQuery(audioContent),
//         payload: { audio: audioContent },
//     });
// }


// const questionsUrl = `https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY}/arxiv.txt`
// const questionsString = await got.get(questionsUrl).text();
// const questions = questionsString.split('\n').map((line) => line.trim()).filter((line) => line.length > 0).map((line) => {
//     const question = line.split('=');
//     return {
//         id: question[0],
//         question: question[1],
//     }
// });
//
// const questionsWithAnswers: Record<string, string> = {};
//


// for(const question of questions) {
//     const aiResponse = await openAi.invoke([
//         new SystemMessage('Your task is to answer the question from user based on the provided article content.'),
//         new SystemMessage('Deeply analyze the content and answer the question.'),
//         new SystemMessage('Make answer short in one sentence.'),
//         new SystemMessage(`<article>${article}</article>`),
//         new HumanMessage(question.question),
//     ]);
//
//     questionsWithAnswers[question.id] = aiResponse.content as string;
// }
//
// try {
//     const aiDevs = new AiDevsService();
//     const response = await aiDevs.sendTask('arxiv', questionsWithAnswers);
//     if(response) {
//         console.log(response.body);
//     }
// } catch (error) {
//     console.error(error);
// }
