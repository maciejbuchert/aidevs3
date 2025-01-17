import got, { HTTPError, RequestError } from "got";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import json from '../files/s01e03/json.json';
import { ChatOpenAI } from "@langchain/openai";
import type { Json } from "../interfaces/tasks/s01e03/Json.ts";

const openAi = new ChatOpenAI({ model: 'gpt-4o' });

const jsonToFix: Json = json;

const fixedJson: Json = {
    "apikey": "780f695d-e3e1-4d85-a5d7-b2371c8dcc86",
    "description": "This is simple calibration data used for testing purposes. Do not use it in production environment!",
    "copyright": "Copyright (C) 2238 by BanAN Technologies Inc.",
    "test-data": [],
}

for(let data of jsonToFix['test-data']) {
    const cleanExpression = data.question.replace(/\s+/g, '');
    const operator = cleanExpression.match(/[\+\-\*\/]/)?.[0];

    if (!operator) {
        throw new Error('Nie znaleziono operatora');
    }

    const [num1Str, num2Str] = cleanExpression.split(operator);
    const num1 = parseInt(num1Str);
    const num2 = parseInt(num2Str);

    switch (operator) {
        case '+':
            data.answer = num1 + num2;
            break;
        case '-':
            data.answer = num1 - num2;
            break;
        case '*':
            data.answer = num1 * num2;
            break;
        case '/':
            if (num2 === 0) {
                throw new Error('Nie można dzielić przez zero');
            }
            data.answer = num1 / num2;
            break;
        default:
            throw new Error('Nieobsługiwany operator');
    }

    if(data.test) {
        const messages = [
            new SystemMessage('Return correct answer for provided question. Just return a answer do not add any thing else'),
            new HumanMessage(data.test.q),
        ];

        const response = await openAi.invoke(messages);
        data.test.a = response.content as string;
    }

    fixedJson["test-data"].push(data);
}

try {
    const body = {
        task: 'JSON',
        apikey: '780f695d-e3e1-4d85-a5d7-b2371c8dcc86',
        answer: fixedJson,
    };
    
    const response = await got.post('https://centrala.ag3nts.org/report', {
        body: JSON.stringify(body)
    }).json();

    console.log(response);
} catch(err: any) {
    if (err instanceof HTTPError) {
        const { response } = err;
        if (response.statusCode === 404) {
            console.log(`Not Found`);
        } else {
            console.log(`HTTP Error: ${err.message}`);
        }
    } else if (err instanceof RequestError) {
        if (err.code === 'ETIMEDOUT') {
            console.log(`Connection timeout ${err.message}`);
        } else {
            console.log('Request Error');
        }
    } else {
        console.log(`Some error: ${err.message}`);
    }
}