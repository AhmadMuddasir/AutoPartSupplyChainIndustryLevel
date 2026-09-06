import express from "express";
import cors from "cors";
import { config } from "./config/config.js";
import connectDB from "./config/db.js";
import router from "./autoPart/autoPartRouter.js";

const app = express();
connectDB();

app.use(cors("*"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.use("/api/supplyChain", router);

app.get("/", (req, res) => {
  res.json({ message: "supply chain api running", environment: config.env });
});

app.use((err, req, res, next) => {
  console.log(err);
});


app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

app.listen(config.port, () => {
  console.log(`server is running at ${config.port}`);
});
