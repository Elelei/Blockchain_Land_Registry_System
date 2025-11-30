# Upload Project to GitHub - Step by Step Guide

## ⚠️ Important: Use Git Bash

Since Git is not recognized in PowerShell, please use **Git Bash** instead:

1. **Right-click** in your project folder: `C:\Users\EverlyneLelei\Videos\MANU\Blockchain-Land-Registry-System--main`
2. Select **"Git Bash Here"**
3. Run the commands below

---

## Step 1: Check Git Installation

```bash
git --version
```

You should see: `git version 2.x.x`

---

## Step 2: Configure Git (First Time Only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 3: Check Current Status

```bash
cd /c/Users/EverlyneLelei/Videos/MANU/Blockchain-Land-Registry-System--main
git status
```

---

## Step 4: Add All Files

```bash
git add .
```

This adds all files except those in `.gitignore` (like `.env`, `node_modules`, etc.)

---

## Step 5: Create Commit

```bash
git commit -m "Initial commit: Blockchain Land Registry System with GIS and Pinata IPFS integration"
```

---

## Step 6: Add Your GitHub Repository

**Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

**OR if you already have a remote, check it first:**
```bash
git remote -v
```

**If remote exists but URL is wrong, update it:**
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

---

## Step 7: Push to GitHub

```bash
git branch -M main
git push -u origin main
```

You'll be prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (not your GitHub password)
  - Create one at: https://github.com/settings/tokens
  - Select scope: `repo`

---

## Alternative: Using SSH (If You Have SSH Keys Set Up)

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Quick Copy-Paste (All Steps)

```bash
# Navigate to project (in Git Bash)
cd /c/Users/EverlyneLelei/Videos/MANU/Blockchain-Land-Registry-System--main

# Configure (first time only)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "Initial commit: Blockchain Land Registry System with GIS and Pinata IPFS integration"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push
git branch -M main
git push -u origin main
```

---

## If You Need to Create a GitHub Repository First:

1. Go to: https://github.com/new
2. Repository name: `Blockchain-Land-Registry-System` (or your preferred name)
3. Choose **Public** or **Private**
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**
6. Copy the repository URL
7. Use it in Step 6 above

---

## Troubleshooting

### If "remote origin already exists":
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### If push is rejected:
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### If authentication fails:
- Use Personal Access Token instead of password
- Or set up SSH keys for easier authentication

---

**Ready to upload!** Use Git Bash and follow the steps above. 🚀

