import express from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { validateRegister, isLoggedIn } from "../middleware/users.js";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: __dirname + "/../.env" });

const router = express.Router();

router.get("/", (req, res) => {
  res
    .status(200)
    .send(
      `This is publicly available content on the main page. Please login to see your books.`
    );
});

router.post("/login", (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE username = ${db.escape(req.body.username)};`,
    (err, result) => {
      // user does not exist
      if (err) {
        throw err;
        return res.status(400).send({
          msg: err,
        });
      }

      if (!result.length) {
        return res.status(401).send({
          msg: "Username or password is incorrect!",
        });
      }

      // check password
      bcrypt.compare(
        req.body.password,
        result[0]["password"],
        (bErr, bResult) => {
          // wrong password
          if (bErr) {
            throw bErr;
            return res.status(401).send({
              msg: "Username or password is incorrect!",
            });
          }

          if (bResult) {
            const token = jwt.sign(
              {
                username: result[0].username,
                userId: result[0].userid,
              },
              process.env.JWT_ENCRYPTION,
              {
                expiresIn: process.env.JWT_EXPIRATION,
              }
            );

            db.query(
              `UPDATE users SET last_login = now() WHERE userid = '${result[0].userid}'`
            );
            return res.status(200).send({
              msg: "Logged in!",
              token,
              user: result[0],
            });
          }
          return res.status(401).send({
            msg: "Username or password is incorrect!",
          });
        }
      );
    }
  );
});

// Pull random sample to represent different users
router.get("/main", isLoggedIn, (req, res, next) => {
  db.query(
    `SELECT * FROM assessment2 ORDER BY RAND() LIMIT 20;`,
    (err, result) => {
      if (err) {
        throw err;
        return res.status(400).send({
          msg: err,
        });
      }
      res.status(200).send(result);
    }
  );
});

router.post("/sign-up", validateRegister, (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE LOWER(username) = LOWER(${db.escape(
      req.body.username
    )});`,
    (err, result) => {
      if (result.length) {
        return res.status(409).send({
          msg: "This username is already in use!",
        });
      } else {
        // username is available
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).send({
              msg: err,
            });
          } else {
            // has hashed pw => add to database
            // db.escape() masks passed parameters to avoid SQL injection
            db.query(
              `INSERT INTO users (userid, username, password, registered, last_login) VALUES ('${uuidv4()}', ${db.escape(
                req.body.username
              )}, ${db.escape(hash)}, now(), now())`,
              (err, result) => {
                if (err) {
                  throw err;
                  return res.status(400).send({
                    msg: err,
                  });
                }
                return res.status(201).send({
                  msg: "Registered!",
                });
              }
            );
          }
        });
      }
    }
  );
});

export default router;