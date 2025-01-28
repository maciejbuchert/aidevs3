export interface Data {
    rozmowa1: Conversation;
    rozmowa2: Conversation;
    rozmowa3: Conversation;
    rozmowa4: Conversation;
    rozmowa5: Conversation;
    reszta: string[];
}

export interface Conversation {
    start: string;
    end: string;
    length: number;
}
