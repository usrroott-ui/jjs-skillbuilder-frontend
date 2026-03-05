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

        try {
            const url = new URL(value);
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

    const resolveApiBase = () => {
        const stored = normalizeApiBase(localStorage.getItem(BACKEND_URL_STORAGE_KEY));
        if (stored) {
            return stored;
        }

        const entered = window.prompt("Backend URL for editor:", DEFAULT_BACKEND_URL);
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
            if (!apiBase) {
                alert("Editor login canceled: backend URL is empty or invalid.");
                return;
            }

            localStorage.setItem(BACKEND_URL_STORAGE_KEY, apiBase);

            try {
                const { response, payload } = await fetchJson(`${apiBase}/api/editor/session`);
                if (response.ok && payload?.authorized) {
                    openEditor(apiBase);
                    return;
                }
            } catch (_error) {
                // Continue to key prompt below.
            }

            const key = window.prompt("Enter editor key:");
            if (!key) {
                return;
            }

            const { response, payload } = await fetchJson(`${apiBase}/api/editor/auth`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ key })
            });

            if (!response.ok || !payload?.ok) {
                const message = payload?.error || "Invalid key or backend is unavailable.";
                alert(`Editor access denied: ${message}`);
                return;
            }

            openEditor(apiBase);
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
