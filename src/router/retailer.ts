import { Router, Request, Response } from "express";
import retailerAI from "../util/retailer";

const router = Router();

router.get("/predict/sales", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) res.status(500).json({ error: "Failed to generate response" });
    const response = await retailerAI.prodictSales(id);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/generate", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) res.status(500).json({ error: "Failed to generate response" });
    const response = await retailerAI.generate(id);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/aisearch", async (req: Request, res: Response) => {
  try {
    const { name = "" } = req.query;
    if (!name) res.status(500).json({ error: "Failed to generate response" });

    const response = await retailerAI.aisearch(name);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
