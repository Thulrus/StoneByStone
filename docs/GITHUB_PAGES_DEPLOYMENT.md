# GitHub Pages Deployment Guide

## Issue: Blank Page on GitHub Pages

If you're seeing a blank page when visiting your GitHub Pages URL, it's likely due to deployment configuration issues.

## Solution: Use GitHub Actions Deployment

### Step 1: Update GitHub Pages Settings

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Build and deployment":
   - **Source**: Select **"GitHub Actions"** (not "Deploy from a branch")
   - This will use the automated workflow in `.github/workflows/deploy.yml`

### Step 2: Verify Branch Configuration

The workflow file has been updated to deploy from the `master` branch (your current branch).

**File: `.github/workflows/deploy.yml`**

- Triggers on: push to `master` branch
- Builds the app with `npm run build`
- Uploads the `dist` folder to GitHub Pages

### Step 3: Commit and Push Changes

```fish
git add -A
git commit -m "fix: update deployment for master branch and add custom icon"
git push origin master
```

### Step 4: Monitor Deployment

1. Go to **Actions** tab in your GitHub repository
2. You should see a workflow run starting automatically
3. Wait for both "build" and "deploy" jobs to complete (green checkmarks)
4. Visit your Pages URL: `https://thulrus.github.io/StoneByStone/`

## Why This Works

### The Problem

- Manual "Deploy from branch" expects static HTML files in the repo root
- Our app needs to be **built** first (`npm run build`) to generate the `dist` folder
- The `dist` folder contains the compiled/bundled app ready for production

### The Solution

- GitHub Actions workflow:
  1. Checks out your code
  2. Installs dependencies (`npm ci`)
  3. Builds the app (`npm run build`)
  4. Deploys the `dist` folder to GitHub Pages

### Important Configuration

**Vite Base Path (`vite.config.ts`)**:

```typescript
base: '/StoneByStone/';
```

This must match your repository name so that assets load correctly.

**Router Base (`src/main.tsx`)**:

```typescript
<BrowserRouter basename="/StoneByStone">
```

This ensures client-side routing works on GitHub Pages.

## Troubleshooting

### Still seeing a blank page?

1. **Check the browser console** (F12 → Console tab)
   - Look for 404 errors on JS/CSS files
   - If you see 404s, the base path might be wrong

2. **Verify repository name matches**
   - Repository name: `StoneByStone`
   - `vite.config.ts` base: `/StoneByStone/`
   - They must match exactly (case-sensitive)

3. **Check Actions workflow**
   - Go to Actions tab
   - Click on the latest workflow run
   - Look for any errors in build or deploy steps

4. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Or open in incognito/private window

### Common Issues

**404 on assets (JS/CSS files)**

- Problem: Base path is incorrect
- Solution: Update `base` in `vite.config.ts` to match repo name

**Blank page but no console errors**

- Problem: Router basename might be wrong
- Solution: Check `basename` in `src/main.tsx`

**Workflow fails to deploy**

- Problem: Permissions not set correctly
- Solution: In repo Settings → Actions → General, ensure "Read and write permissions" is enabled

## Alternative: Manual Deployment

If you prefer manual deployment (not recommended):

```fish
# Build the app
npm run build

# Use the gh-pages package
npm run deploy
```

This will:

1. Build your app to `dist/`
2. Push the `dist` folder to a `gh-pages` branch
3. GitHub Pages will serve from that branch

Then set GitHub Pages source to "Deploy from a branch" → `gh-pages` branch → `/ (root)`.

## Expected URLs

- **Production**: `https://thulrus.github.io/StoneByStone/`
- **Local Dev**: `http://localhost:3000/StoneByStone/`

Both use the same base path for consistency.

## Deployment Checklist

- [x] GitHub Actions workflow targets correct branch (`master`)
- [x] GitHub Pages source set to "GitHub Actions"
- [x] Vite base path matches repository name (`/StoneByStone/`)
- [x] Router basename matches repository name
- [ ] Changes committed and pushed
- [ ] Workflow runs successfully (check Actions tab)
- [ ] Site loads at Pages URL

## Next Steps After First Deployment

Once working, every push to `master` will automatically:

1. Trigger the workflow
2. Build your app
3. Deploy to GitHub Pages
4. Your site updates in ~1-2 minutes

No manual steps needed! 🚀
