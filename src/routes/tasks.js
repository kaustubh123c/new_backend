const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs   = require('fs');
const path = require('path');

const router    = express.Router();
const DATA_FILE = path.join(__dirname, '../data/tasks.json');

// ── Helpers ─────────────────────────────────────────────────────────────────

const readTasks = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeTasks = (tasks) => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
};

// ── GET /api/tasks ──────────────────────────────────────────────────────────
// Fetch all tasks (optionally filter by ?completed=true/false)
router.get('/', (req, res) => {
  let tasks = readTasks();
  if (req.query.completed !== undefined) {
    const done = req.query.completed === 'true';
    tasks = tasks.filter(t => t.completed === done);
  }
  res.json(tasks);
});

// ── GET /api/tasks/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const task = readTasks().find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// ── POST /api/tasks ─────────────────────────────────────────────────────────
// Create a new task  Body: { title, priority? }
router.post('/', (req, res) => {
  const { title, priority = 'medium' } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = {
    id:        uuidv4(),
    title:     title.trim(),
    completed: false,
    priority,                         // 'low' | 'medium' | 'high'
    createdAt: new Date().toISOString(),
  };
  const tasks = [...readTasks(), task];
  writeTasks(tasks);
  res.status(201).json(task);
});

// ── PUT /api/tasks/:id ──────────────────────────────────────────────────────
// Toggle completed OR update title/priority  Body: { title?, priority? }
router.put('/:id', (req, res) => {
  const tasks = readTasks();
  const idx   = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  tasks[idx] = {
    ...tasks[idx],
    completed: !tasks[idx].completed,
    ...(req.body.title    && { title:    req.body.title.trim() }),
    ...(req.body.priority && { priority: req.body.priority }),
    updatedAt: new Date().toISOString(),
  };
  writeTasks(tasks);
  res.json(tasks[idx]);
});

// ── DELETE /api/tasks/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const tasks = readTasks();
  const exists = tasks.some(t => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Task not found' });
  writeTasks(tasks.filter(t => t.id !== req.params.id));
  res.json({ message: 'Task deleted successfully' });
});

// ── DELETE /api/tasks  (clear all completed) ────────────────────────────────
router.delete('/', (req, res) => {
  const remaining = readTasks().filter(t => !t.completed);
  writeTasks(remaining);
  res.json({ message: 'Completed tasks cleared', remaining: remaining.length });
});

module.exports = router;
