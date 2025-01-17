import { Ollama } from "@langchain/ollama";
import got from "got"
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import AiDevsService from "../services/AiDevsService.ts";

const data = await got.get('https://centrala.ag3nts.org/data/780f695d-e3e1-4d85-a5d7-b2371c8dcc86/cenzura.txt').text();

console.log(data);

const llm = new Ollama({
    model: 'gemma2:2b',
    temperature: 0,
    maxRetries: 2,
});

const messages = [
    new SystemMessage(`Do not add anything from yourself`),
    new SystemMessage(`Do not don't paraphrase`),
    new SystemMessage(`Replace personal data with "CENZURA". Keep the original text structure and language. Output only the processed text.

    Replace:
        - all names -> "CENZURA"
        - city names -> "CENZURA"
        - street names and numbers -> "CENZURA"
        - age numbers -> "CENZURA"

    Example input:
        Osoba podejrzana to Andrzej Mazur. Adres: Gdańsk, ul. Długa 8. Wiek: 29 lat.

    Example output:
        Osoba podejrzana to CENZURA. Adres: CENZURA, ul. CENZURA. Wiek: CENZURA lat.`),
    new SystemMessage(`Keep "lat." and "lata." in the same form.`),
    new HumanMessage(data),
]

const censoredData = await llm.invoke(messages)

const aiDevsService = new AiDevsService();
const response = await aiDevsService.sendTask('CENZURA', censoredData.replace(' \n', ''));
console.log(response?.body);

