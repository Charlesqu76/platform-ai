import AI from "./ai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
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

class RetailerAi extends AI {
  constructor() {
    super();
  }

  aisearch = async (name) => {
    const searchTool = new TavilySearchResults({
      maxResults: 2,
    });
    const tools = [searchTool];

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        price: z.number(),
        description: z.string(),
        references: z.array(z.string()),
      })
    );

    const agent = createReactAgent({ llm: this.llmModel, tools });

    const agentFinalState = await agent.invoke({
      messages: `you are an analyiist and hired by a product retailer, 
        and will search the product name on the internet such as e-bay, amazon, and other ecommerce-platform, 
        format template: ${parser.getFormatInstructions()}
        product name: ${name} ,
        `,
    });

    const cnt =
      agentFinalState.messages[agentFinalState.messages.length - 1].content;

    if (cnt.startsWith("```json")) {
      try {
        const c = cnt.replace("json", "").replace("```", "").replace("```", "");
        return JSON.parse(c);
      } catch (e) {}
    }
    return { content: cnt };
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

  normal = async (id, question, res: any) => {
    const [sales, view] = await Promise.all([
      sql.getData(id),
      sql.getViewData(id),
    ]);

    const history = new UpstashRedisChatMessageHistory({
      sessionId: "test",
      config: {
        url: "https://tolerant-finch-44544.upstash.io",
        token: "Aa4AAAIjcDE1MjZmODZhOGFkNGE0Mjk0OWMzYWY5MDI3YTg0ZWVkNHAxMA",
      },
    });

    const memory = new BufferMemory({
      memoryKey: "test",
      chatHistory: history,
    });

    memory.chatHistory.addUserMessage(question);
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        predicts: z.array(z.object({ date: z.string(), value: z.number() })),
      })
    ).getFormatInstructions();

    const prompt = ChatPromptTemplate.fromTemplate(
      `You are an data analysist hired by a product retailer, you need to analyze the users' sales data and user's view data and ansert the retailer's question 
      if the quesiton is about the users' portrait: generating a user portrait summarizing typical behavior and preferences, and providing suggestions for improving engagement and conversion rates.
      if the question is about the preduct the sales, return the json data and the format is {predict}
      else return the text
      sales data: {sales},
      views data: {view},
      history: {history}
      user: {question}`
    );

    // @ts-ignore
    const historyText = await memory.loadMemoryVariables();

    const chain = RunnableSequence.from([prompt, this.model]);

    const stream = chain.stream({
      question,
      history: historyText,
      sales: JSON.stringify(sales),
      view: JSON.stringify(view),
      predict: parser,
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
