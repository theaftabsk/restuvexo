const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { addExpense, getExpenses, deleteExpense } = require("../controllers/expenseController");

router.post("/", authenticate, addExpense);
router.get("/", authenticate, getExpenses);
router.delete("/:id", authenticate, deleteExpense);

module.exports = router;
