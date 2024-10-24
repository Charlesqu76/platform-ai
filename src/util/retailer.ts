import AI from "./ai";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { z } from "zod";
import { sql } from "../sql";
import { BufferMemory } from "langchain/memory";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { RunnableSequence } from "@langchain/core/runnables";
import dotenv from "dotenv";

dotenv.config();

class RetailerAi extends AI {
  constructor() {
    super();
  }

  aisearch = async (name) => {
    const searchTool = new TavilySearchResults({
      maxResults: 3,
    });
    const tools = [searchTool];

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        price: z.number(),
        description: z.string(),
        references: z.array(z.string()),
      })
    );

    const text = `you are an analyiist and hired by a product retailer, 
        and will search the product name on the internet such as e-bay, amazon, and other ecommerce-platform, 
        format template: ${parser.getFormatInstructions()}
        product name: ${name} ,
        `;

    const agent = createReactAgent({
      llm: this.llmModel,
      tools,
    });

    const { messages } = await agent.invoke({ messages: text });

    const { content } = messages.slice(-1)[0];

    return await parser.parse(content);
  };

  predict = async (id) => {
    const [buy] = await Promise.all([sql.getData(id)]);
    const prompt = PromptTemplate.fromTemplate(`
         Given the historical sales data, predict the sales for all the products for the next 14 days. 
        format template: {format},
        historial sales data: {data},
      `);

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        predicts: z.array(z.object({ date: z.string(), value: z.number() })),
      })
    );

    const chain = prompt.pipe(this.model);

    const stream = chain.stream({
      data: JSON.stringify(buy),
      format: parser.getFormatInstructions(),
    });

    return stream;
  };

  generate = async (id) => {
    const [buy, view] = await Promise.all([
      sql.getData(id),
      sql.getViewData(id),
    ]);

    const prompt = PromptTemplate.fromTemplate(`
      Analyze the dataset with fields including name (user's name), time (time of action), geo (user's geographic location), device (type of device used), and gender (user's gender), 
      with the analysis goals of identifying trends in user behavior (viewing and purchasing actions), understanding how geographic location and device types influence actions, examining gender's impact on viewing or purchasing,
       generating a user portrait summarizing typical behavior and preferences, and providing suggestions for improving engagement and conversion rates.     
      view data {view}
       buy data {buy}
       format: {format}
      `);
    const parser = new StringOutputParser();

    const chain = prompt.pipe(this.model).pipe(parser);

    const stream = chain.stream({
      view: JSON.stringify(view),
      buy: JSON.stringify(buy),
      format: parser.getFormatInstructions(),
    });

    return stream;
  };

  normal = async (id, question: string, chatId: string, res: any) => {
    const [sales, view] = await Promise.all([
      sql.getData(id),
      sql.getViewData(id),
    ]);

    const history = new UpstashRedisChatMessageHistory({
      sessionId: chatId || "t",
      config: {
        // @ts-ignore
        url: process.env.REDIS_URL,
        // @ts-ignore
        token: process.env.REDIS_TOKEN,
      },
    });

    const memory = new BufferMemory({
      memoryKey: "test",
      chatHistory: history,
    });

    // @ts-ignore
    const historyText = await memory.loadMemoryVariables();

    memory.chatHistory.addUserMessage(question);

    let prompt = PromptTemplate.fromTemplate(
      `system: You are an data analysist hired by a product retailer, you need to analyze the users' sales data and user's view data and ansert the retailer's question  
      sales data: {sales} 
      views data: {view} 
      "history", {history} `
    );
    if (question.includes("predict")) {
      prompt = PromptTemplate.fromTemplate(`
        Given the historical sales data, predict the sales.
        format template: {format},
        {question}
     `);
    }
    if (question.includes("portrait")) {
      prompt = PromptTemplate.fromTemplate(`
        Analyze the dataset with fields including name (user's name), time (time of action), geo (user's geographic location), device (type of device used), and gender (user's gender), 
        with the analysis goals of identifying trends in user behavior (viewing and purchasing actions), understanding how geographic location and device types influence actions, examining gender's impact on viewing or purchasing,
         generating a user portrait summarizing typical behavior and preferences, and providing suggestions for improving engagement and conversion rates.     
      {question}
        `);
    } else {
    }

    const chain = RunnableSequence.from([prompt, this.model]);

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        predicts: z.array(z.object({ date: z.string(), value: z.number() })),
      })
    ).getFormatInstructions();

    const stream = chain.stream({
      history: historyText,
      sales: JSON.stringify(sales),
      view: JSON.stringify(view),
      predict: parser,
      question,
    });

    let text = "";
    for await (const chunk of await stream) {
      text += chunk;
      res.write(chunk);
    }
    memory.chatHistory.addAIChatMessage(text);
    return stream;
  };
}

const retailerAI = new RetailerAi();

export default retailerAI;
