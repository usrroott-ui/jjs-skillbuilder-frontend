(() => {
    const STORAGE_KEY = "JJS_ICON_PANEL_MODE";
    const body = document.body;
    const iconPanel = document.getElementById("iconPanel");
    const toggle = document.getElementById("iconPanelToggle");
    const toggleLabel = toggle?.querySelector("[data-toggle-label]") || null;
    const iconList = document.getElementById("iconList");

    if (!body || !iconPanel || !toggle || !iconList) {
        return;
    }

    const getMode = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "full" ? "full" : "mini";
        } catch (_error) {
            return "mini";
        }
    };

    const saveMode = (mode) => {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (_error) {
            // ignore storage errors
        }
    };

    const applyMode = (mode) => {
        const isFull = mode === "full";
        body.classList.toggle("icons-expanded", isFull);
        if (toggleLabel) {
            toggleLabel.textContent = isFull ? "MINI" : "FULL";
        } else {
            toggle.textContent = isFull ? "MINI" : "FULL";
        }
        toggle.setAttribute("aria-label", isFull ? "Show mini icons" : "Show full icons");
        toggle.setAttribute("aria-pressed", String(isFull));

        iconList.querySelectorAll("img").forEach((image) => {
            const mini = String(image.dataset.mini || image.getAttribute("src") || "").trim();
            const full = String(image.dataset.full || "").trim();

            if (!image.dataset.mini && mini) {
                image.dataset.mini = mini;
            }

            image.src = isFull && full ? full : mini;
        });
    };

    const syncNewIcons = () => {
        const mode = body.classList.contains("icons-expanded") ? "full" : "mini";
        iconList.querySelectorAll("img").forEach((image) => {
            const currentSrc = String(image.getAttribute("src") || "").trim();
            if (!image.dataset.mini && currentSrc) {
                image.dataset.mini = currentSrc;
            }
        });
        applyMode(mode);
    };

    toggle.addEventListener("click", () => {
        const nextMode = body.classList.contains("icons-expanded") ? "mini" : "full";
        saveMode(nextMode);
        applyMode(nextMode);
    });

    const observer = new MutationObserver(() => {
        syncNewIcons();
    });

    observer.observe(iconList, { childList: true, subtree: true });
    syncNewIcons();
    applyMode(getMode());
})();
