import process from "node:process";
import {QdrantVectorStore} from "@langchain/qdrant";
import {OpenAIEmbeddings} from "@langchain/openai";
import {Document} from "@langchain/core/documents";

class QdrantVectorDb {
    private readonly store: QdrantVectorStore;
    private readonly embeddings: OpenAIEmbeddings;

    constructor(collectionName: string) {
        this.embeddings = new OpenAIEmbeddings();
        this.store = new QdrantVectorStore(this.embeddings, {
            url: process.env.QDRANT_URL,
            collectionName,
            apiKey: process.env.QDRANT_VECTOR_DB_API_KEY,
        });
    }

    async addDocumentsToStore(documents: Document[]) {
        await this.store.addDocuments(documents);
    }

    async addDocumentToStore(document: Document) {
        await this.store.addDocuments([document]);
    }

    async searchStore(query: string, k: number = 3) {
        return await this.store.similaritySearch(query, k);
    }
}

export default QdrantVectorDb;
