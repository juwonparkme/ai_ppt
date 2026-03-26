document.addEventListener("DOMContentLoaded", function () {
    const previewSource = document.getElementById("editor-preview-data");
    const previewItems = previewSource ? JSON.parse(previewSource.textContent) : [];
    const slideItems = Array.from(document.querySelectorAll(".result-slide-item"));
    const imagePreview = document.getElementById("editor-image-preview");
    const textPreview = document.getElementById("editor-text-preview");
    const slideKind = document.getElementById("editor-slide-kind");
    const slideTitle = document.getElementById("editor-slide-title");
    const slideSubtitle = document.getElementById("editor-slide-subtitle");
    const slideBullets = document.getElementById("editor-slide-bullets");
    const slideIndex = document.getElementById("editor-slide-index");
    const inspectorSlideTitle = document.getElementById("inspector-slide-title");
    const inspectorSlideSubtitle = document.getElementById("inspector-slide-subtitle");
    const downloadLink = document.getElementById("result-download");
    const downloadToast = document.getElementById("download-toast");
    const downloadToastText = document.getElementById("download-toast-text");

    function renderBullets(bullets) {
        if (!slideBullets) {
            return;
        }
        slideBullets.innerHTML = "";

        (bullets || []).slice(0, 4).forEach(function (bullet) {
            const item = document.createElement("li");
            item.className = "flex items-start gap-3 text-base leading-7 text-on-surface-variant";
            item.innerHTML = '<span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"></span><span></span>';
            item.querySelector("span:last-child").textContent = bullet;
            slideBullets.appendChild(item);
        });
    }

    function activateSlide(item) {
        slideItems.forEach(function (button) {
            button.classList.remove("ring-2", "ring-primary");
        });
        item.classList.add("ring-2", "ring-primary");

        const index = Number(item.dataset.index || "0");
        const preview = previewItems[index] || {};
        const kind = preview.kind;

        if (slideIndex) {
            slideIndex.textContent = "Slide " + (index + 1);
        }

        if (kind === "image") {
            if (slideKind) {
                slideKind.textContent = "image";
            }
            if (slideTitle) {
                slideTitle.textContent = preview.title || "Image Preview";
            }
            if (slideSubtitle) {
                slideSubtitle.textContent = "이미지 기반 슬라이드 미리보기입니다.";
            }
            renderBullets([]);
            if (imagePreview) {
                imagePreview.src = preview.image_url || "";
                imagePreview.classList.remove("hidden");
            }
            textPreview?.classList.add("hidden");
        } else {
            slideKind.textContent = preview.slide_kind || "slide";
            if (slideTitle) {
                slideTitle.textContent = preview.title || "Untitled Slide";
            }
            if (slideSubtitle) {
                slideSubtitle.textContent = preview.subtitle || "선택한 슬라이드 상세가 여기 표시됩니다.";
            }
            imagePreview?.classList.add("hidden");
            textPreview?.classList.remove("hidden");
            renderBullets(preview.bullets);
        }

        if (inspectorSlideTitle) {
            inspectorSlideTitle.textContent = preview.title || "Untitled Slide";
        }
        if (inspectorSlideSubtitle) {
            inspectorSlideSubtitle.textContent = preview.subtitle || ((preview.bullets || []).join(" · ") || "선택한 슬라이드 상세가 여기 갱신됩니다.");
        }
    }

    slideItems.forEach(function (item) {
        item.addEventListener("click", function () {
            activateSlide(item);
        });
    });

    if (slideItems.length > 0 && previewItems.length > 0) {
        activateSlide(slideItems[0]);
    }

    if (downloadLink && downloadToast && downloadToastText) {
        downloadLink.addEventListener("click", function () {
            downloadToast.classList.remove("hidden");
            downloadToastText.textContent = "다운로드를 시작했습니다.";
            window.setTimeout(function () {
                downloadToast.classList.add("hidden");
            }, 2600);
        });
    }
});
