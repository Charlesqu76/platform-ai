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

router.get("/predict", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }
    const chunks = await retailerAI.predict(id);
    for await (const chunk of chunks) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/generate", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }
    const stream = await retailerAI.generate(id);
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/normal", async (req: Request, res: Response) => {
  try {
    const { id, question } = req.query;
    if (!id) {
      res.status(500).json({ error: "Failed to generate response" });
      return;
    }
    await retailerAI.normal(id, question as string, res);
    res.send();
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
