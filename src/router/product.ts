import { Router, Request, Response } from "express";
import productAi from "../util/product";

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
  try {
    const { id } = req.query;
    if (!id) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }

    const response = await productAi.summary(id as string);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default productsRouter;
