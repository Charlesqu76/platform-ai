import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import AI from "./ai";
import client from "../database";
import { PoolClient } from "pg";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const getHistorySalesByDay = async (c: PoolClient) => {
  const data = await c.query(`
    SELECT date, COUNT(date)
      FROM (

      SELECT TO_CHAR(time, 'YYYY-MM-DD') AS date 
      FROM product AS p
      INNER JOIN purchase AS pur ON (p.id = pur.product)
      WHERE p.retailer = 1
      )
      GROUP BY date

`);
  return data.rows;
};

const getData = async (c: PoolClient) => {
  const res = await c.query(
    `
SELECT c.name, time, pur.price, geo, device , gender 
	FROM purchase pur
	JOIN customer c ON (c.id = pur.customer)
	JOIN product p ON (p.id = pur.product)
	WHERE retailer = 1 AND time >= NOW() - INTERVAL '3 month'
  `
  );
  return res.rows;
};

const getViewData = async (c: PoolClient) => {
  const res = await c.query(
    `
   	    SELECT c.name, time, geo, device , gender 
	FROM view AS v
	JOIN customer c ON (c.id = v.customer)
	JOIN product p ON (p.id = v.product)
	WHERE retailer = 1 AND time >= NOW() - INTERVAL '3 month'
  `
  );
  return res.rows;
};

class RetailerAi extends AI {
  constructor() {
    super();
    if (!this.model) {
      throw new Error("model needs to be initialized");
    }
  }

  prodictSales = async () => {
    const c = await client.connect();
    const data = await getHistorySalesByDay(c);

    const prompt = PromptTemplate.fromTemplate(`
         Given the historical sales data, predict the sales for the next 14 days. 
        format template: {format},
        historial sales data: {data}
      `);

    const parser = StructuredOutputParser.fromZodSchema(
      z.array(
        z.object({
          date: z.string(),
          value: z.number(),
        })
      )
    );

    const chain = prompt.pipe(this.model).pipe(parser);

    const response = await chain.invoke({
      data: JSON.stringify(data),
      format: parser.getFormatInstructions(),
    });

    return response;
  };

  generate = async () => {
    const c = await client.connect();
    const d = await getData(c);
    const [buy, view] = await Promise.all([getData(c), getViewData(c)]);

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

    // const analyzeUserBehaviorTool = {
    //   name: "analyzeUserBehavior",
    //   description: "Analyzes user behavior and generates insights using OpenAI",
    //   func: async (user) => {
    //     const prompt = `
    //     Given the following user data:
    //     - Views: ${JSON.stringify(user.views)}
    //     - Purchases: ${JSON.stringify(user.purchases)}

    //     Please generate insights such as:
    //     - Most frequently viewed product categories
    //     - Most frequently purchased product categories
    //     - Device preference for viewing products
    //     - User engagement level (high, moderate, low) based on views and purchases.
    //     `;
    //     return this.model.invoke([new SystemMessage(prompt)]);
    //   },
    // };
    return { data: res };
  };
}

const retailerAI = new RetailerAi();

export default retailerAI;
