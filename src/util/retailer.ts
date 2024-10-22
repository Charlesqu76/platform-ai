import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import AI from "./ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { z } from "zod";
import { sql } from "../sql";

class RetailerAi extends AI {
  constructor() {
    super();
    if (!this.model) {
      throw new Error("model needs to be initialized");
    }
  }

  prodictSales = async (id) => {
    const data = await sql.getHistorySalesByDay(id);

    const prompt = PromptTemplate.fromTemplate(`
         Given the historical sales data, predict the sales for all the products for the next 14 days. 
        format template: {format},
        historial sales data: {data}
      `);

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        name: z.string(),
        predicts: z.array(z.object({ date: z.string(), value: z.number() })),
      })
    );

    const chain = prompt.pipe(this.model).pipe(parser);

    const response = await chain.invoke({
      data: JSON.stringify(data),
      format: parser.getFormatInstructions(),
    });

    return response;
  };

  generate = async (id) => {
    const [buy, view] = await Promise.all([
      sql.getData(id),
      sql.getViewData(id),
    ]);
    const systemJson = {
      dataset: {
        fields: [
          {
            name: "name",
            description: "user name",
          },

          {
            name: "time",
            description: "time of when the action occurred",
          },
          {
            name: "geo",
            description: "Geographic location of the user",
          },
          {
            name: "device",
            description: "Type of device used (e.g., mobile, desktop)",
          },
          {
            name: "gender",
            description: "Gender of the user (e.g., male, female, other)",
          },
        ],
      },
      analysisGoals: [
        "Identify trends in user behavior based on viewing and purchasing actions.",
        "Analyze how geographic location influences user actions.",
        "Examine the distribution of actions across different devices.",
        "Understand how gender impacts the likelihood of viewing or purchasing.",
        "Generate a user portrait that summarizes typical user behavior and preferences.",
        "give some suggestions",
      ],
      instructions: `Please analyze the data and provide a detailed report that includes insights into user behavior patterns and a user portrait based on the provided criteria. and provide some suggesstions `,
    };

    const system = JSON.stringify(systemJson);

    const user = `view data ${JSON.stringify(view)}
      buy data ${JSON.stringify(buy)}`;

    const messages = [new SystemMessage(system), new HumanMessage(user)];
    const res = await this.model.invoke(messages);
    return { data: res };
  };

  aisearch = async (name) => {
    const searchTool = new TavilySearchResults({
      maxResults: 2,
      // ...
    });
    const tools = [searchTool];

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        price: z.number(),
        description: z.string(),
        reason: z.string(),
        references: z.array(z.string()),
      })
    );

    const agent = createReactAgent({ llm: this.model, tools });

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
}

const retailerAI = new RetailerAi();

export default retailerAI;
