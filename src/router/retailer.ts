import { Router, Request, Response } from "express";
import retailerAI from "../util/retailer";

const router = Router();

router.get("/predict/sales", async (req: Request, res: Response) => {
  try {
    const response = await retailerAI.prodictSales();
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/generate", async (req: Request, res: Response) => {
  try {
    const response = await retailerAI.generate();
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
