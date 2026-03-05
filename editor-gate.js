(() => {
    const BACKEND_URL_STORAGE_KEY = "JJS_BACKEND_URL";
    const DEFAULT_BACKEND_URL = "http://localhost:3000";
    const DOUBLE_PRESS_MS = 700;

    let lastF9At = 0;
    let flowBusy = false;

    const normalizeApiBase = (raw) => {
        const value = String(raw || "").trim();
        if (!value) {
            return "";
        }

        let candidate = value;

        if (/^\d{2,5}$/.test(candidate)) {
            candidate = `http://localhost:${candidate}`;
        } else if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(candidate)) {
            if (candidate.startsWith("//")) {
                candidate = `${window.location.protocol}${candidate}`;
            } else if (candidate.startsWith("/")) {
                candidate = `${window.location.origin}${candidate}`;
            } else {
                candidate = `http://${candidate}`;
            }
        }

        try {
            const url = new URL(candidate);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return "";
            }
            return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
        } catch (_error) {
            return "";
        }
    };

    const fetchJson = async (url, init = {}) => {
        const response = await fetch(url, {
            ...init,
            credentials: "include"
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (_error) {
            payload = null;
        }

        return { response, payload };
    };

    const isMixedContent = (apiBase) => (
        window.location.protocol === "https:"
        && String(apiBase || "").startsWith("http://")
    );

    const makeConnectionHint = (apiBase, error) => {
        if (isMixedContent(apiBase)) {
            return [
                "Browser blocked request: HTTPS page cannot call HTTP backend.",
                "Use one of these options:",
                "1) Open frontend locally via http://localhost:5173",
                "2) Put backend behind HTTPS",
                `Current backend URL: ${apiBase}`
            ].join("\n");
        }

        return [
            `Cannot connect to backend: ${apiBase}`,
            "Check:",
            "1) backend is running (`npm run dev` in /backend)",
            "2) port and URL are correct",
            `3) error: ${String(error?.message || error)}`
        ].join("\n");
    };

    const promptForNewApiBase = (current) => {
        const entered = window.prompt("Cannot reach backend. Enter backend URL:", current || DEFAULT_BACKEND_URL);
        if (entered === null) {
            return null;
        }

        const normalized = normalizeApiBase(entered);
        if (!normalized) {
            alert("Backend URL is invalid.");
            return "";
        }

        localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
        return normalized;
    };

    const withRetryOnConnectionFailure = async (apiBase, action) => {
        try {
            return await action(apiBase);
        } catch (error) {
            alert(makeConnectionHint(apiBase, error));
            const nextApiBase = promptForNewApiBase(apiBase);
            if (!nextApiBase) {
                return false;
            }
            if (isMixedContent(nextApiBase)) {
                alert(makeConnectionHint(nextApiBase, new Error("Mixed content")));
                return false;
            }
            return action(nextApiBase);
        }
    };

    const resolveApiBase = () => {
        const stored = normalizeApiBase(localStorage.getItem(BACKEND_URL_STORAGE_KEY));
        if (stored) {
            localStorage.setItem(BACKEND_URL_STORAGE_KEY, stored);
            return stored;
        }

        const entered = window.prompt("Backend URL for editor:", DEFAULT_BACKEND_URL);
        if (entered === null) {
            return null;
        }
        const normalized = normalizeApiBase(entered);
        if (!normalized) {
            return "";
        }

        localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
        return normalized;
    };

    const openEditor = (apiBase) => {
        const url = `editor.html?api=${encodeURIComponent(apiBase)}`;
        window.location.href = url;
    };

    const runEditorFlow = async () => {
        if (flowBusy) {
            return;
        }
        flowBusy = true;

        try {
            const apiBase = resolveApiBase();
            if (apiBase === null) {
                return;
            }

            if (!apiBase) {
                alert("Editor login canceled: backend URL is empty or invalid.");
                return;
            }
            if (isMixedContent(apiBase)) {
                alert(makeConnectionHint(apiBase, new Error("Mixed content")));
                return;
            }

            localStorage.setItem(BACKEND_URL_STORAGE_KEY, apiBase);

            const completed = await withRetryOnConnectionFailure(apiBase, async (resolvedApiBase) => {
                const { response: sessionResponse, payload: sessionPayload } = await fetchJson(`${resolvedApiBase}/api/editor/session`);
                if (sessionResponse.ok && sessionPayload?.authorized) {
                    openEditor(resolvedApiBase);
                    return true;
                }

                const key = window.prompt("Enter editor key:");
                if (!key) {
                    return false;
                }

                const { response, payload } = await fetchJson(`${resolvedApiBase}/api/editor/auth`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ key })
                });

                if (!response.ok || !payload?.ok) {
                    const message = payload?.error || "Invalid key or backend is unavailable.";
                    alert(`Editor access denied: ${message}`);
                    return false;
                }

                localStorage.setItem(BACKEND_URL_STORAGE_KEY, resolvedApiBase);
                openEditor(resolvedApiBase);
                return true;
            });

            if (!completed) {
                return;
            }
        } catch (error) {
            alert(`Editor access failed: ${String(error?.message || error)}`);
        } finally {
            flowBusy = false;
        }
    };

    window.addEventListener("keydown", (event) => {
        if (event.key !== "F9" || event.repeat) {
            return;
        }

        event.preventDefault();

        const now = Date.now();
        if (now - lastF9At <= DOUBLE_PRESS_MS) {
            lastF9At = 0;
            void runEditorFlow();
            return;
        }

        lastF9At = now;
    });
})();
