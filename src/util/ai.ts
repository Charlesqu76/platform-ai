import { OpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

export default class AI {
  model: OpenAI | undefined;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw Error("openai api key is required");
    }
    const model = new OpenAI({
      model: "gpt-3.5-turbo-0125",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }
}
