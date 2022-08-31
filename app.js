import express from "express";
import cors from "cors";

const port = 5000;
const server = express();
server.use(cors());
server.use(express.json());

server.listen(port, () => { console.log("Listen on port 5000") })

