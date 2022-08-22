import { Router } from "express";

import { reward } from "../controller/bulk-mint"

const router = Router();

router.get("/", (req:any, res:any) => {
  res.json({
    status: "online",
  });
});

router.post("/reward", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  await reward(req, res)
})

export default router;