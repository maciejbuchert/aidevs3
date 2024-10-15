import AiDevsService from "../services/AiDevsService.ts";
import got from 'got';

const file = await got.get('https://poligon.aidevs.pl/dane.txt').text();
const strings = file.split('\n').filter((string) => string.trim() !== '');

const aiDevsService = new AiDevsService();
const taskResponse = await aiDevsService.sendTask('POLIGON', strings);

console.log(taskResponse);
