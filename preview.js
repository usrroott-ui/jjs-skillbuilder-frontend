const iconList = document.querySelector(".icon-list");

if (iconList) {
    const preview = document.createElement("img");
    preview.classList.add("full-preview");
    document.body.appendChild(preview);

    let activeIcon = null;
    let activateTimer = null;
    let activateTarget = null;
    let hideTimer = null;
    let miniHideTimer = null;
    let miniHideTarget = null;
    const ACTIVATE_DELAY_MS = 110;
    const HIDE_DELAY_MS = 90;
    const MINI_HIDE_DELAY_MS = 130;
    const fullImageSizes = new Map();

    const getIconFromNode = (node) => {
        if (!(node instanceof Element)) {
            return null;
        }
        return node.closest(".icon-list img");
    };

    const cancelHide = () => {
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    };

    const cancelActivate = () => {
        if (activateTimer !== null) {
            clearTimeout(activateTimer);
            activateTimer = null;
        }
        activateTarget = null;
    };

    const cancelMiniHide = () => {
        if (miniHideTimer !== null) {
            clearTimeout(miniHideTimer);
            miniHideTimer = null;
            miniHideTarget = null;
        }
    };

    const preloadIcon = (icon) => {
        const src = String(icon?.dataset?.full || "");
        if (!src || fullImageSizes.has(src)) {
            return;
        }

        const preload = new Image();
        preload.addEventListener("load", () => {
            fullImageSizes.set(src, {
                width: preload.naturalWidth,
                height: preload.naturalHeight
            });
        });
        preload.src = src;

        if (preload.complete && preload.naturalWidth > 0) {
            fullImageSizes.set(src, {
                width: preload.naturalWidth,
                height: preload.naturalHeight
            });
        }
    };

    const preloadVisibleIcons = () => {
        iconList.querySelectorAll("img").forEach(preloadIcon);
    };

    const applyPreviewSize = (src, fallbackRect) => {
        const size = fullImageSizes.get(src);
        if (size) {
            preview.style.width = `${size.width}px`;
            preview.style.height = `${size.height}px`;
            return;
        }

        // Fallback while image metadata is not cached yet.
        preview.style.width = `${fallbackRect.width}px`;
        preview.style.height = `${fallbackRect.height}px`;
    };

    const replaySlide = () => {
        preview.classList.remove("is-expanded");
        void preview.offsetWidth;
        preview.classList.add("is-expanded");
    };

    const activatePreviewForIcon = (icon, rect) => {
        const fullSrc = String(icon.dataset.full || "");
        if (!fullSrc) {
            return;
        }

        if (activeIcon && activeIcon !== icon) {
            activeIcon.classList.remove("is-hidden");
        }

        activeIcon = icon;
        icon.classList.remove("is-hidden");
        preloadIcon(icon);

        preview.src = fullSrc;
        preview.style.left = `${window.scrollX + rect.left}px`;
        preview.style.top = `${window.scrollY + rect.top}px`;
        preview.style.setProperty("--mini-width", `${rect.width}px`);
        applyPreviewSize(fullSrc, rect);

        preview.classList.add("is-active");
        replaySlide();

        miniHideTarget = icon;
        miniHideTimer = setTimeout(() => {
            if (activeIcon === miniHideTarget) {
                miniHideTarget.classList.add("is-hidden");
            }
            miniHideTimer = null;
            miniHideTarget = null;
        }, MINI_HIDE_DELAY_MS);
    };

    const handleEnter = (icon) => {
        cancelHide();
        cancelMiniHide();
        cancelActivate();

        if (activeIcon && activeIcon !== icon) {
            activeIcon.classList.remove("is-hidden");
            preview.classList.remove("is-expanded");
            preview.classList.remove("is-active");
            activeIcon = null;
        }

        icon.classList.remove("is-hidden");
        preloadIcon(icon);

        activateTarget = icon;
        activateTimer = setTimeout(() => {
            if (activateTarget !== icon) {
                return;
            }

            const rect = icon.getBoundingClientRect();
            activatePreviewForIcon(icon, rect);
            activateTimer = null;
            activateTarget = null;
        }, ACTIVATE_DELAY_MS);
    };

    const handleLeave = (icon) => {
        if (activateTarget === icon) {
            cancelActivate();
        }

        if (miniHideTarget === icon) {
            cancelMiniHide();
        }

        if (activeIcon !== icon) {
            icon.classList.remove("is-hidden");
            return;
        }

        hideTimer = setTimeout(() => {
            preview.classList.remove("is-expanded");
            preview.classList.remove("is-active");
            icon.classList.remove("is-hidden");
            if (activeIcon === icon) {
                activeIcon = null;
            }
            hideTimer = null;
        }, HIDE_DELAY_MS);
    };

    iconList.addEventListener("mouseover", (event) => {
        const icon = getIconFromNode(event.target);
        if (!icon) {
            return;
        }

        const previous = getIconFromNode(event.relatedTarget);
        if (previous === icon) {
            return;
        }

        handleEnter(icon);
    });

    iconList.addEventListener("mouseout", (event) => {
        const icon = getIconFromNode(event.target);
        if (!icon) {
            return;
        }

        const next = getIconFromNode(event.relatedTarget);
        if (next === icon) {
            return;
        }

        handleLeave(icon);
    });

    preloadVisibleIcons();
}
