import { PoolClient } from "pg";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import client from "../database";
import AI from "./ai";
import { Document } from "langchain/document";
import { pull } from "langchain/hub";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import {
  JSONLinesLoader,
  JSONLoader,
} from "langchain/document_loaders/fs/json";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { z } from "zod";

type TProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
};
type TComment = {
  comment: string;
  rate: number;
};

const queryProducts = async (c: PoolClient) => {
  const res = await c.query(`
    SELECT p.*, CAST(AVG(pur.rate) AS FLOAT) AS ratings
                FROM product AS p
                LEFT OUTER JOIN purchase AS pur ON (p.id = pur.product)
                GROUP BY p.id`);
  return res.rows;
};

const queryUserRecord = async (c: PoolClient) => {
  const res = await c.query(`
    (SELECT name, description, price
              FROM product
              WHERE product.id in (
              SELECT p.id FROM
                  purchase AS pur
                  JOIN product AS P ON ( pur.product = P.id )
              WHERE
                  customer = 1
              GROUP BY p.id
              )) UNION (SELECT name, description, price
              FROM product
              WHERE product.id in (
              SELECT p.id FROM
                  view AS v
                  JOIN product AS P ON ( v.product = P.id )
              WHERE
                  customer = 1
              GROUP BY p.id
              ))`);
  return res.rows;
};

export class ProductAI extends AI {
  constructor() {
    super();
    if (!this.model) return;
  }

  recommend = async (query: string | null, userId: number | null) => {
    const c = await client.connect();
    let res;
    if (userId) {
      res = await Promise.all([queryProducts(c), queryUserRecord(c)]);
    } else {
      res = await Promise.all([queryProducts(c)]);
    }

    const [products, preferences] = res;

    // const documents = products.map(
    //   ({ description, name, id }) =>
    //     new Document({
    //       pageContent: description,
    //       metadata: {
    //         id: id,
    //         title: name,
    //       },
    //     })
    // );

    // const inMemoryVectorStore = await MemoryVectorStore.fromDocuments(
    //   documents,
    //   new OpenAIEmbeddings()
    // );

    // const vectorStoreRetriever = inMemoryVectorStore.asRetriever({
    //   k: 6,
    //   searchType: "similarity",
    // });

    // const retrievedDocuments = await vectorStoreRetriever.invoke("Smartphone");
    // const ragPrompt = await pull("rlm/rag-prompt");
    // const exampleMessages = await ragPrompt.invoke({
    //   context: "filler context",
    //   question: "filler question",
    // });

    // const runnableRagChain = RunnableSequence.from([
    //   {
    //     context: vectorStoreRetriever.pipe(formatDocumentsAsString),
    //     question: new RunnablePassthrough(),
    //   },
    //   ragPrompt,
    //   this.model,
    //   new StringOutputParser(),
    // ]);

    // const customTemplate = `Use the following pieces of context to answer the question at the end.
    //                           If you don't know the answer, just say that you don't know, don't try to make up an answer.
    //                           Use three sentences maximum and keep the answer as concise as possible.
    //                           Always say "thanks for asking!" at the end of the answer.

    //                           {context}

    //                            {question}

    //                           Helpful Answer:`;

    // const customRagPrompt = PromptTemplate.fromTemplate(customTemplate);

    // const customRagChain = await createStuffDocumentsChain({
    //   llm: this.model,
    //   prompt: customRagPrompt,
    //   outputParser: new StringOutputParser(),
    // });

    // const system = `Recommend products that are ${JSON.stringify(
    //   products
    // )} based on user preferences if provide and user query if provide.
    //    return all the products if there is not query but order by the user preferences
    //  . And return the recommened products id in JSON formating template: [id, id, id]`;

    // const user = `
    // here are the user query: ${query} and
    // user preferences: ${JSON.stringify(preferences)}
    // `;

    // const context = await vectorStoreRetriever.invoke(user);

    // const res1 = await customRagChain.invoke({
    //   question: user,
    //   context: context,
    // });

    // console.log(res1);

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

    return response;
  };

  summaryComments = async (id: string) => {
    const c = await client.connect();
    const comments = await c.query(`
      									SELECT *
            FROM purchase
                INNER JOIN customer ON (customer.id = purchase.customer)
            WHERE product = ${id} AND comment IS NOT NULL`);

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

    const chain = prompt.pipe(this.model);
    const response = await chain.invoke({ comments: JSON.stringify(comments) });

    return {
      summary: response,
    };
  };
}

const productAi = new ProductAI();

export default productAi;
