document.addEventListener("DOMContentLoaded", function () {
    const imageInput = document.getElementById("id_profile_image");
    const imagePreview = document.getElementById("profile-image-preview");
    const fileNameLabel = document.getElementById("profile-image-filename");

    if (!imageInput || !imagePreview || !fileNameLabel) {
        return;
    }

    const defaultSrc = imagePreview.dataset.defaultSrc || imagePreview.getAttribute("src") || "";
    let activeObjectUrl = null;

    function restoreDefaultPreview() {
        if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
            activeObjectUrl = null;
        }
        imagePreview.src = defaultSrc;
        fileNameLabel.textContent = "";
        fileNameLabel.classList.add("hidden");
    }

    imageInput.addEventListener("change", function () {
        const selectedFile = imageInput.files && imageInput.files[0];

        if (!selectedFile) {
            restoreDefaultPreview();
            return;
        }

        if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
        }

        activeObjectUrl = URL.createObjectURL(selectedFile);
        imagePreview.src = activeObjectUrl;
        fileNameLabel.textContent = selectedFile.name;
        fileNameLabel.classList.remove("hidden");
    });

    window.addEventListener("beforeunload", function () {
        if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
        }
    });

    restoreDefaultPreview();
});
