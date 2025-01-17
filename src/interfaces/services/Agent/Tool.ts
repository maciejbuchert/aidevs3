export interface Tool {
    instruction: string;
    description: string;
    function: (...params: any) => Promise<string>;
}
