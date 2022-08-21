import { Router } from "express";

import { reward } from "../controller/bulk-mint"

const router = Router();

router.get("/", (req:any, res:any) => {
  res.json({
    status: "online",
  });
});

router.post("/reward", async (req, res) => { await reward(req, res)})

export default router;