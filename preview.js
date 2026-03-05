const preview = document.createElement("img");
preview.classList.add("full-preview");
document.body.appendChild(preview);

let activeIcon = null;
const icons = document.querySelectorAll(".icon-list img");
let activateTimer = null;
let activateTarget = null;
let hideTimer = null;
let miniHideTimer = null;
let miniHideTarget = null;
const ACTIVATE_DELAY_MS = 110;
const HIDE_DELAY_MS = 90;
const MINI_HIDE_DELAY_MS = 130;
const fullImageSizes = new Map();

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
    if (activeIcon && activeIcon !== icon) {
        activeIcon.classList.remove("is-hidden");
    }

    activeIcon = icon;
    icon.classList.remove("is-hidden");

    const fullSrc = icon.dataset.full;
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

// Preload full images to keep hover animation smooth and lock final size.
icons.forEach((icon) => {
    const src = icon.dataset.full;
    if (fullImageSizes.has(src)) {
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
});

icons.forEach((icon) => {
    icon.addEventListener("mouseenter", () => {
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
    });

    icon.addEventListener("mouseleave", () => {
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
    });
});
