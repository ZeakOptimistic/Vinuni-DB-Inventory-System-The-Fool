# Installation & Setup Guide

This document explains how to set up the database and run the project locally.

> Tech stack: **MySQL 8**, **Django REST backend**, **React frontend**.

Repository layout (relevant folders):

- `database/`
  - `schema.sql` – SQL script to create the `sipms` schema (tables, PK/FK, indexes).
  - `seed_data.sql` – SQL script to insert sample data for demo and testing.
- `backend/` – Django REST API (to be implemented).
- `frontend/` – React UI (to be implemented).
- `docs/` – project documentation.

---

## 1. Prerequisites

- **MySQL 8.x** installed and running on `localhost:3306`.
- **Python 3.10+** (for Django backend).
- **Node.js 18+** (for React frontend).
- Git and a terminal (Command Prompt, PowerShell, or similar).

---

## 2. Clone the repository

```bash
git clone https://github.com/ZeakOptimistic/Vinuni-DB-Inventory-System-The-Fool.git
cd Vinuni-DB-Inventory-System-The-Fool
