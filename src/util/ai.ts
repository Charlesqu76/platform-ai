import { ChatOpenAI, OpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

export default class AI {
  model: ChatOpenAI | undefined;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw Error("openai api key is required");
    }
    const model = new ChatOpenAI({
      model: "gpt-3.5-turbo",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }
}
