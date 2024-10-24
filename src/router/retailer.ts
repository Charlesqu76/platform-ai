import { Router, Request, Response } from "express";
import retailerAI from "../util/retailer";

const router = Router();

router.get("/aisearch", async (req: Request, res: Response) => {
  try {
    const { name = "" } = req.query;
    if (!name) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }
    const response = await retailerAI.aisearch(name);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/normal", async (req: Request, res: Response) => {
  try {
    const { id, question, chatId } = req.query;
    if (!id) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }
    await retailerAI.normal(id, question as string, chatId as string, res);
    res.send();
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
