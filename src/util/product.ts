import AI from "./ai";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { sql } from "../sql";

export class ProductAI extends AI {
  constructor() {
    super();
  }

  recommend = async (query: string | null, userId: number | null) => {
    let res;
    if (userId) {
      res = await Promise.all([sql.queryProducts(), sql.queryUserRecord()]);
    } else {
      res = await Promise.all([sql.queryProducts()]);
    }
    const [products, preferences] = res;
    const productMap = products.reduce((acc, cur) => {
      acc[cur["id"]] = cur;
      return acc;
    }, {});

    const prompt = PromptTemplate.fromTemplate(`
      Recommend products that are {products} based on user preferences if provide and user query if provide.
      formart template: {format} 
      here are the user query: {query}
      user preferences: {preferences}
      `);

    const parser = StructuredOutputParser.fromZodSchema(z.array(z.number()));

    const chain = prompt.pipe(this.model).pipe(parser);

    const response = await chain.invoke({
      products: JSON.stringify(products),
      query: query,
      preferences: JSON.stringify(preferences),
      format: parser.getFormatInstructions(),
    });

    return response.map((id) => productMap[id]);
  };

  summary = async (id: string) => {
    const comments = await sql.comments(id);
    const prompt = PromptTemplate.fromTemplate(`
              You are analyzing a list of commit messages that describe product reviews. Each commit contains both the comment and rating provided by customers. Please summarize the following commits by identifying key themes in the customer comments, highlighting any common feedback, concerns, or praises, and providing an overall impression of the product. Your summary should focus on the customer's perspective, including:
                Positive aspects: What do customers like most about the product?
                Negative aspects: What are the recurring issues or concerns raised by customers?
                Average rating: Based on the ratings provided, what is the general satisfaction level of the customers?
                Example format:
                Positive aspects: Customers appreciate the [feature/aspect].
                Negative aspects: Many customers have raised concerns about [issue/aspect].
                Average rating: The overall satisfaction is [average rating or qualitative summary].
                Please summarize these and provide insights.
                comments: {comments}
              `);

    const parser = new StringOutputParser();
    const chain = prompt.pipe(this.model).pipe(parser);
    const response = await chain.invoke({ comments: JSON.stringify(comments) });

    return {
      summary: response,
    };
  };
}

const productAi = new ProductAI();

export default productAi;
