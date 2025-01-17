import AiDevsService from "../services/AiDevsService.ts";
import got from "got";
import PdfParse from "pdf-parse";

const notesUrl = 'https://centrala.ag3nts.org/dane/notatnik-rafala.pdf';
const notes = await got.get(notesUrl).buffer();

const questionsUrl = `https://centrala.ag3nts.org/data/${process.env.AIDEVS_API_KEY}/notes.json`;
const questions = await got.get(questionsUrl).json<Record<string, string>>();

const parsedNotes = await PdfParse(notes);

const data: Record<string, string> = {};

try {
    const aiDevs = new AiDevsService();
    const response = await aiDevs.sendTask('notes', data);
    if(response) {
        console.log(response.body);
    }
} catch (error) {
    console.error(error);
}
