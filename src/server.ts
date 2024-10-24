import express from "express";
import retailer from "./router/retailer";
import dotenv from "dotenv";
import productsRouter from "./router/product";
import cors from "cors";

dotenv.config();

const app = express();

const allowedOrigins = ["http://127.0.0.1:3000", "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

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
