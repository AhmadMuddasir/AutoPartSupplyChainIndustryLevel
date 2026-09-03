import express from "express";

import {
  createautoPart,
  getAllAutoParts,
  getAutoPart,
  getAutoPartByTokenId,
  updateAutoPart,
  deleteAutoPart,
  mintAutoPart,
  syncPartWithBlockchain,
} from "./autopartController.js";

const router = express.Router();

router.get("/", getAllAutoParts);
router.get("/:id", getAutoPart);
router.get("/token/:tokenId", getAutoPartByTokenId);

router.post("/createautoParts", createautoPart);
router.patch("/:id", updateAutoPart);
router.delete("/:id", deleteAutoPart);
router.post("/mint", mintAutoPart);
router.post("sync/:tokenId", syncPartWithBlockchain);

export default router;
