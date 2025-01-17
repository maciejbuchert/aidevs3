export interface Json {
    apikey: string;
    description: string;
    copyright: string;
    'test-data': Data[];
}

export interface Data {
    question: string;
    answer: number;
    test?: {
        q: string;
        a: string;
    }
}