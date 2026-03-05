# Frontend (Public + GitHub Pages)

Static UI for JJS Skillbuilder.

## Editor hotkey

- Press `F9` twice quickly.
- If there is no active cookie session, key prompt will appear.
- After successful auth, inline editor panel opens directly on `index.html`.
- Editor changes are auto-saved to backend (shared for all users), not only localStorage.
- Canvas editor supports image and video elements (video upload up to 200 MB via backend).
- For durable video links on Render Free, backend should use `VIDEO_STORAGE_PROVIDER=github_release`.

## Local run

```bash
python -m http.server 5173
# open http://localhost:5173
```

## Deploy

Deployment is automated via `.github/workflows/deploy-pages.yml`.
