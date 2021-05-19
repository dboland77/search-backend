import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./routes/router.js";

const app = express();

const PORT = process.env.PORT || 8888;

app.use(bodyParser.json());
app.use(cors());

app.use("/api", router);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));