import { Pool, PoolClient } from "pg";
import client from "./database";

class Client {
  clinet: Pool;
  constructor(client: Pool) {
    this.clinet = client;
  }

  getHistorySalesByDay = async (id) => {
    return (
      await this.clinet.query(`
        SELECT p.name, TO_CHAR(pur.time, 'YYYY-MM-DD') AS date, COUNT(*) 
        FROM product p
        INNER JOIN purchase pur ON p.id = pur.product
        WHERE p.retailer = ${id} AND time >= NOW() - INTERVAL '3 month'
        GROUP BY p.name, TO_CHAR(pur.time, 'YYYY-MM-DD')
    `)
    ).rows;
  };

  getData = async (id) => {
    return (
      await this.clinet.query(
        `
  SELECT c.name, time, pur.price, geo, device , gender 
      FROM purchase pur
      JOIN customer c ON (c.id = pur.customer)
      JOIN product p ON (p.id = pur.product)
      WHERE retailer = ${id} AND time >= NOW() - INTERVAL '3 month'
    `
      )
    ).rows;
  };

  getViewData = async (id) => {
    return (
      await this.clinet.query(
        `
             SELECT c.name, time, geo, device , gender 
      FROM view AS v
      JOIN customer c ON (c.id = v.customer)
      JOIN product p ON (p.id = v.product)
      WHERE retailer = ${id} AND time >= NOW() - INTERVAL '3 month'
    `
      )
    ).rows;
  };

  queryUserRecord = async () => {
    return (
      await this.clinet.query(`
      (SELECT name, description, price
                FROM product
                WHERE product.id in (
                SELECT p.id FROM
                    purchase AS pur
                    JOIN product AS P ON ( pur.product = P.id )
                WHERE
                    customer = 1
                GROUP BY p.id
                )) UNION (SELECT name, description, price
                FROM product
                WHERE product.id in (
                SELECT p.id FROM
                    view AS v
                    JOIN product AS P ON ( v.product = P.id )
                WHERE
                    customer = 1
                GROUP BY p.id
                ))`)
    ).rows;
  };

  queryProducts = async () => {
    return (
      await this.clinet.query(`
      SELECT p.name, p.description , p.id, p.price, CAST(AVG(pur.rate) AS FLOAT) AS ratings
                  FROM product AS p
                  LEFT OUTER JOIN purchase AS pur ON (p.id = pur.product)
                  GROUP BY p.id`)
    ).rows;
  };

  comments = async (id) => {
    return (
      await this.clinet.query(`
        SELECT *
            FROM purchase
            INNER JOIN customer ON (customer.id = purchase.customer)
            WHERE product = ${id} AND comment IS NOT NULL`)
    ).rows;
  };
}

export const sql = new Client(client);
