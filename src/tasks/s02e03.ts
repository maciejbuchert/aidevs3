import got from "got";
import {DallEAPIWrapper} from "@langchain/openai";
import AiDevsService from "../services/AiDevsService.ts";

const file = await got.get(`https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY!}/robotid.json`).text();

const description = JSON.parse(file).description;

const tool = new DallEAPIWrapper({
    n: 1,
    model: 'dall-e-3',
    apiKey: process.env.OPENAI_API_KEY,
    size: '1024x1024',
    style: 'natural',
    quality: 'standard',
    dallEResponseFormat: 'url'
});

const imageURL = await tool.invoke(description);

console.log(imageURL);

const aiDevs = new AiDevsService();
const response = await aiDevs.sendTask('robotid', imageURL);
console.log(response!.body);
