import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log("=== Testing category INSERT (PostgreSQL) ===");

try {
  await pool.query(
    `INSERT INTO categories (name, description, color) VALUES ($1, $2, $3)`,
    ["TestCat1", null, "#22d3ee"]
  );
  console.log("Test 1 (null description): OK");
} catch (e) {
  console.error("Test 1 FAIL:", e.message);
}

try {
  await pool.query(
    `INSERT INTO categories (name, description, color) VALUES ($1, $2, $3)`,
    ["TestCat2", "", "#22d3ee"]
  );
  console.log("Test 2 (empty string description): OK");
} catch (e) {
  console.error("Test 2 FAIL:", e.message);
}

try {
  await pool.query(`INSERT INTO categories (name, color) VALUES ($1, $2)`, ["TestCat3", "#22d3ee"]);
  console.log("Test 3 (no description column): OK");
} catch (e) {
  console.error("Test 3 FAIL:", e.message);
}

await pool.query(`DELETE FROM categories WHERE name IN ($1, $2, $3)`, [
  "TestCat1",
  "TestCat2",
  "TestCat3",
]);
console.log("Cleanup done");
await pool.end();
