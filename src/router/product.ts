import { Router, Request, Response } from "express";
import productAi from "../util/product";
// import { generateResponse } from "../services/langchainService";

const commets = [
  {
    comment: null,
    rate: null,
  },
  {
    comment: "Sample comment 764",
    rate: 5,
  },
  {
    comment: "Sample comment 933",
    rate: 3,
  },
  {
    comment: null,
    rate: null,
  },
  {
    comment: "Sample comment 288",
    rate: null,
  },
  {
    comment: "Sample comment 477",
    rate: 3,
  },
  {
    comment: "Sample comment 141",
    rate: null,
  },
  {
    comment: "Sample comment 383",
    rate: 4,
  },
  {
    comment: null,
    rate: 2,
  },
  {
    comment: null,
    rate: null,
  },
  {
    comment: "Sample comment 272",
    rate: 3,
  },
  {
    comment: null,
    rate: 3,
  },
  {
    comment: "Sample comment 432",
    rate: 1,
  },
  {
    comment: "Sample comment 605",
    rate: 1,
  },
  {
    comment: "Sample comment 470",
    rate: null,
  },
  {
    comment: "Sample comment 733",
    rate: 4,
  },
  {
    comment: "Sample comment 699",
    rate: 4,
  },
  {
    comment: "Sample comment 624",
    rate: 3,
  },
  {
    comment: null,
    rate: 5,
  },
];

const productsRouter = Router();

productsRouter.get("/recommend", async (req: Request, res: Response) => {
  const { id = null, q = null } = req.query;
  try {
    const response = await productAi.recommend(q as string, id as any);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

productsRouter.get("/summary", async (req: Request, res: Response) => {
  const { id } = req.query;
  try {
    const response = await productAi.summaryComments(id as string);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default productsRouter;
