import {ChatOpenAI} from "@langchain/openai";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";

const openAi = new ChatOpenAI({ model: 'gpt-4o-mini' });

const map = [
    {
        obiekt: "punkt startowy",
        x: 0,
        y: 0
    },
    {
        obiekt: "pole",
        x: 1,
        y: 0
    },
    {
        obiekt: "drzewo",
        x: 2,
        y: 0
    },
    {
        obiekt: "dom",
        x: 3,
        y: 0
    },
    {
        obiekt: "pole",
        x: 0,
        y: 1
    },
    {
        obiekt: "wiatrak",
        x: 1,
        y: 1
    },
    {
        obiekt: "pole",
        x: 2,
        y: 1
    },
    {
        obiekt: "pole",
        x: 3,
        y: 1
    },
    {
        obiekt: "pole",
        x: 0,
        y: 2
    },
    {
        obiekt: "pole",
        x: 1,
        y: 2
    },
    {
        obiekt: "skały",
        x: 2,
        y: 2
    },
    {
        obiekt: "drzewa",
        x: 3,
        y: 2
    },
    {
        obiekt: "skały",
        x: 0,
        y: 3
    },
    {
        obiekt: "skały",
        x: 1,
        y: 3
    },
    {
        obiekt: "samochód",
        x: 2,
        y: 3
    },
    {
        obiekt: "jaskinia",
        x: 3,
        y: 3
    },
];

const server = Bun.serve({
    async fetch(request) {
        const body = await request.json() as { instruction: string };
        console.log(body);

        const messages = [
            new SystemMessage(`Your task is to define final position of robot by provided instructions of movement.
                        Provided instructions are in Polish and are in the form of "poleciałem jedno pole w prawo, a później na sam dół".
                        Provide description of the final position in Polish language in a way that describes a given field (for example "skały").
                        Maximum length of the description is one or two words.
                        Do not provide any additional information. Starting position is always on the pin.`),
            new SystemMessage(`### MAP
            ${JSON.stringify(map)}
            ###`),
            new HumanMessage(body.instruction),
        ];

        const response = await openAi.invoke(messages);
        console.log(response.content as string);

        return Response.json({
            description: response.content as string
        });
    },
});

console.log(`Listening on ${server.port}`);
