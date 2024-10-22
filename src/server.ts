import express from "express";
import retailer from "./router/retailer";
import dotenv from "dotenv";
import productsRouter from "./router/product";

dotenv.config();

const app = express();
app.use(express.json());
const port = 3002;

app.use((req, res, next) => {
  console.info(
    "Time:",
    Date.now().toLocaleString(),
    "url: ",
    req.url,
    "body: ",
    req.body
  );
  next();
});

app.get("/", (req, res) => {
  res.send("Hello, TypeScript Express with Webpack!");
});

app.use("/ai", retailer, productsRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
