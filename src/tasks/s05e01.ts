import got from "got";
import type {Data} from "../interfaces/tasks/s05e01/Data.ts";
import {ChatOpenAI} from "@langchain/openai";
import {HumanMessage} from "@langchain/core/messages";
import AiDevsService from "../services/AiDevsService.ts";
import fs from "node:fs";


const dataUrl = `https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY}/phone_sorted.json`;
const data = await got.get(dataUrl).json<Data>();

const questionsUrl = `https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY}/phone_questions.json`
const questions = await got.get(questionsUrl).json<Record<string, string>>();

const factsFiles = fs.readdirSync('src/files/s03e01/facts');
const facts: Record<string, string> = {};
for(const file of factsFiles) {
    facts[file] = fs.readFileSync(`src/files/s03e01/facts/${file}`, 'utf-8');
}

const openAi = new ChatOpenAI({ model: 'o1-mini' });
const messages = [
    new HumanMessage(`Na podstawie rozmów odpowiedz na pytanie`),
    new HumanMessage(`Staraj się odpowiadać zwięźle. Jedno, dwa słowa.`),
    new HumanMessage(`Pomocne mogą być fakty.`),
    new HumanMessage(`W każdej rozmowie uczestniczą tylko dwie osoby, które wypowiadają się naprzemiennie. Imiona rozmówców są unikalne, więc jeśli np. Stefan pojawia się w pierwszej i piątej rozmowie, to jest to ten sam Stefan.`),
    new HumanMessage(`
    <rozmowy>
    ${JSON.stringify(data)}
    </rozmowy>
    `),
    new HumanMessage(`
    <fakty>
    ${JSON.stringify(facts)}
    </fakty>
    `),
];

const responses: Record<string, string> = {};

for (const [id, question] of Object.entries(questions)) {
    if(!responses[id]) {
        const response = await openAi.invoke([
            ...messages,
            new HumanMessage(`Number pytania: ${id}`),
            new HumanMessage(`Pytanie: ${question}`)
        ]);

        responses[id] = (response.content as string).replace('.', '');
    }
}

console.log(responses);

try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('phone', responses);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
