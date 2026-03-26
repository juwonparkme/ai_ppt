document.addEventListener("DOMContentLoaded", function () {
    const slideItems = Array.from(document.querySelectorAll(".result-slide-item"));
    const imagePreview = document.getElementById("editor-image-preview");
    const textPreview = document.getElementById("editor-text-preview");
    const slideTitle = document.getElementById("editor-slide-title");
    const slideIndex = document.getElementById("editor-slide-index");
    const downloadLink = document.getElementById("result-download");
    const downloadToast = document.getElementById("download-toast");
    const downloadToastText = document.getElementById("download-toast-text");

    function activateSlide(item) {
        slideItems.forEach(function (button) {
            button.classList.remove("ring-2", "ring-primary");
        });
        item.classList.add("ring-2", "ring-primary");

        const kind = item.dataset.kind;
        const value = item.dataset.value || "";
        const index = item.dataset.index || "1";

        if (slideIndex) {
            slideIndex.textContent = "Slide " + index;
        }

        if (kind === "image") {
            if (imagePreview) {
                imagePreview.src = value;
                imagePreview.classList.remove("hidden");
            }
            textPreview?.classList.add("hidden");
        } else {
            if (slideTitle) {
                slideTitle.textContent = value;
            }
            imagePreview?.classList.add("hidden");
            textPreview?.classList.remove("hidden");
        }
    }

    slideItems.forEach(function (item) {
        item.addEventListener("click", function () {
            activateSlide(item);
        });
    });

    if (slideItems.length > 0) {
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
