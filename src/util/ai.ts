import { ChatOpenAI, OpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

export default class AI {
  model: OpenAI;
  llmModel: ChatOpenAI;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw Error("openai api key is required");
    }
    const config = {
      model: "gpt-4o-mini",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    };
    this.model = new OpenAI(config);

    this.llmModel = new ChatOpenAI(config);
  }
}
