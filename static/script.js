class OdooDevTools {
    constructor() {
        // --- Configuration Keys ---
        this.EXTENSION_ENABLED_KEY = "odooDevExtensionEnabled";
        this.BACKGROUND_ENABLED_KEY = "odooDevEnableBackground";
        this.IMAGE_STORAGE_KEY = "odoo_bg";

        // --- State Variables ---
        this.selectedFile = null;
        this.statusTimeout = null;

        // --- Initialize ---
        this.initializeElements();
        this.bindEvents();
        this.loadSavedState();
    }

    initializeElements() {
        // Main Extension Toggle
        this.extensionToggle = document.getElementById("extensionEnabledToggle");
        this.toggleLabel = document.getElementById("toggleLabel");

        // Background Image Toggle
        this.backgroundToggle = document.getElementById("backgroundEnabledToggle");
        this.backgroundToggleLabel = document.getElementById("backgroundToggleLabel");

        // Image Upload Elements
        this.uploadArea = document.getElementById("uploadArea");
        this.uploadInput = document.getElementById("uploadImage");
        this.uploadText = document.getElementById("uploadText");
        this.fileInfo = document.getElementById("fileInfo");

        // Action Buttons
        this.saveButton = document.getElementById("saveImage");
        this.clearButton = document.getElementById("clearImage");

        // Image Preview Elements
        this.previewImage = document.getElementById("previewImage");
        this.placeholderText = document.getElementById("placeholderText");

        // Image Information Display
        this.imageInfoDiv = document.getElementById("imageInfo");
        this.imageName = document.getElementById("imageName");
        this.imageSize = document.getElementById("imageSize");
        this.imageType = document.getElementById("imageType");
        this.imageDimensions = document.getElementById("imageDimensions");

        // Status Message Elements
        this.statusMessageEl = document.getElementById("statusMessage");
    }

    bindEvents() {
        if (this.extensionToggle) {
            this.extensionToggle.addEventListener("change", () => this.handleExtensionToggle());
        }
        if (this.backgroundToggle) {
            this.backgroundToggle.addEventListener("change", () => this.handleBackgroundToggle());
        }
        if (this.uploadInput) {
            this.uploadInput.addEventListener("change", (e) => this.handleFileSelect(e.target.files));
        }
        if (this.uploadArea) {
            this.uploadArea.addEventListener("dragover", (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener("dragleave", (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener("drop", (e) => this.handleDrop(e));
            ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
                this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            });
        }
        if (this.saveButton) {
            this.saveButton.addEventListener("click", () => this.saveImage());
        }
        if (this.clearButton) {
            this.clearButton.addEventListener("click", () => this.clearStoredImage());
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    loadSavedState() {
        chrome.storage.local.get(
            [this.EXTENSION_ENABLED_KEY, this.BACKGROUND_ENABLED_KEY, this.IMAGE_STORAGE_KEY],
            (result) => {
                const isExtensionEnabled = result[this.EXTENSION_ENABLED_KEY] !== false;
                if (this.extensionToggle) {
                    this.extensionToggle.checked = isExtensionEnabled;
                    this.updateToggleText(this.toggleLabel, isExtensionEnabled, "Habilitado", "Deshabilitado");
                }

                if (this.backgroundToggle) {
                    const isBackgroundEnabledStored = result[this.BACKGROUND_ENABLED_KEY] !== false;
                    this.backgroundToggle.checked = isBackgroundEnabledStored;
                    this.updateToggleText(this.backgroundToggleLabel, isBackgroundEnabledStored, "Activado", "Desactivado");
                    this.backgroundToggle.disabled = !isExtensionEnabled;
                }

                if (result[this.IMAGE_STORAGE_KEY]) {
                    this.displayImagePreviewUI(result[this.IMAGE_STORAGE_KEY], { name: "Imagen Guardada" });
                    if (this.clearButton) this.clearButton.style.display = "inline-flex";
                } else {
                    this.resetImageUI();
                    if (this.clearButton) this.clearButton.style.display = "none";
                }
            }
        );
    }

    handleExtensionToggle() {
        const isEnabled = this.extensionToggle.checked;
        chrome.storage.local.set({ [this.EXTENSION_ENABLED_KEY]: isEnabled }, () => {
            this.updateToggleText(this.toggleLabel, isEnabled, "Habilitado", "Deshabilitado");
            if (this.backgroundToggle) this.backgroundToggle.disabled = !isEnabled;

            // If disabling the main extension, also effectively disable the background feature in storage
            // and notify content script, as the background relies on the main extension being active.
            if (!isEnabled) {
                chrome.storage.local.set({ [this.BACKGROUND_ENABLED_KEY]: false }, () => {
                     if(this.backgroundToggle) this.backgroundToggle.checked = false;
                     this.updateToggleText(this.backgroundToggleLabel, false, "Activado", "Desactivado");
                     // Notify about background change as well, which will make client.js remove the style
                     this.notifyContentScript({ type: "ODEV_BACKGROUND_STATE_CHANGED", backgroundEnabled: false });
                });
            }
            // Always notify about the main state change (which triggers reload)
            this.notifyContentScript({ type: "ODEV_EXTENSION_STATE_CHANGED", enabled: isEnabled });
            this.showStatus(isEnabled ? "Extensión Habilitada" : "Extensión Deshabilitada", isEnabled ? "success" : "info");
        });
    }

    handleBackgroundToggle() {
        const isBackgroundFeatureEnabled = this.backgroundToggle.checked;
        chrome.storage.local.set({ [this.BACKGROUND_ENABLED_KEY]: isBackgroundFeatureEnabled }, () => {
            this.updateToggleText(this.backgroundToggleLabel, isBackgroundFeatureEnabled, "Activado", "Desactivado");
            // Notify the content script about the background enable/disable state.
            // The content script will then send the image data (if any) and this flag to the main world.
            this.notifyContentScript({ type: "ODEV_BACKGROUND_STATE_CHANGED", backgroundEnabled: isBackgroundFeatureEnabled });
            this.showStatus(isBackgroundFeatureEnabled ? "Fondo Personalizado Activado" : "Fondo Personalizado Desactivado", "info");
        });
    }

    updateToggleText(labelElement, isChecked, enabledText, disabledText) {
        if (labelElement) {
            labelElement.textContent = isChecked ? enabledText : disabledText;
        }
    }

    handleFileSelect(files) {
        if (files && files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleDragOver(event) { this.uploadArea.classList.add("border-purple-400", "bg-purple-50"); }
    handleDragLeave(event) { this.uploadArea.classList.remove("border-purple-400", "bg-purple-50"); }

    handleDrop(event) {
        this.uploadArea.classList.remove("border-purple-400", "bg-purple-50");
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            if (files[0].type.startsWith("image/")) {
                this.uploadInput.files = files;
                this.processFile(files[0]);
            } else {
                this.showStatus("Por favor, selecciona un archivo de imagen válido.", "error");
            }
        }
    }

    processFile(file) {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showStatus("El archivo es demasiado grande (Máx 10MB).", "error");
            this.resetFileInput();
            return;
        }
        this.selectedFile = file;
        if (this.uploadText) this.uploadText.textContent = file.name;
        if (this.fileInfo) this.fileInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline mr-1 text-green-500"><path d="M9 12l2 2 4-4"></path></svg>${file.name} (${this.formatFileSize(file.size)})`;
        if (this.saveButton) this.saveButton.disabled = false;
        if (this.clearButton) this.clearButton.style.display = "inline-flex";
        if (this.uploadArea) this.uploadArea.classList.add("border-green-400");
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImagePreviewUI(e.target.result, file);
        };
        reader.readAsDataURL(file);
    }

    displayImagePreviewUI(dataUrl, fileDetails) {
        if (this.previewImage) {
            this.previewImage.src = dataUrl;
            this.previewImage.classList.remove("hidden");
        }
        if (this.placeholderText) this.placeholderText.style.display = "none";
        if (fileDetails && this.imageInfoDiv) {
            const img = new Image();
            img.onload = () => {
                if (this.imageName) this.imageName.textContent = fileDetails.name || "N/A";
                if (this.imageSize) this.imageSize.textContent = fileDetails.size ? this.formatFileSize(fileDetails.size) : "N/A";
                if (this.imageType) this.imageType.textContent = fileDetails.type || "N/A";
                if (this.imageDimensions) this.imageDimensions.textContent = `${img.width} × ${img.height}px`;
                this.imageInfoDiv.classList.remove("hidden");
            };
            img.src = dataUrl;
        } else if (this.imageInfoDiv) {
            this.imageInfoDiv.classList.add("hidden");
        }
    }

    resetImageUI() {
        if (this.previewImage) {
            this.previewImage.src = "";
            this.previewImage.classList.add("hidden");
        }
        if (this.placeholderText) this.placeholderText.style.display = "block";
        if (this.imageInfoDiv) this.imageInfoDiv.classList.add("hidden");
        this.resetFileInput();
    }

    resetFileInput() {
        if (this.uploadInput) this.uploadInput.value = "";
        this.selectedFile = null;
        if (this.uploadText) this.uploadText.textContent = "Seleccionar imagen";
        if (this.fileInfo) this.fileInfo.innerHTML = "";
        if (this.saveButton) this.saveButton.disabled = true;
        if (this.uploadArea) this.uploadArea.classList.remove("border-green-400");
    }

    async saveImage() {
        if (!this.selectedFile) {
            this.showStatus("Selecciona una imagen primero.", "error");
            return;
        }
        if (this.saveButton) {
            this.saveButton.disabled = true;
            const originalButtonContent = this.saveButton.innerHTML;
            this.saveButton.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" ...></svg>
                    Guardando...
                </span>`;
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                chrome.storage.local.set({ [this.IMAGE_STORAGE_KEY]: imageData }, () => {
                    console.log("Imagen guardada en storage.");
                    this.saveButton.disabled = false;
                    this.saveButton.innerHTML = originalButtonContent;
                    this.showStatus("Imagen Guardada Exitosamente", "success");
                    if (this.clearButton) this.clearButton.style.display = "inline-flex";

                    // After saving an image, if the background toggle is ON,
                    // we need to tell the content script to update.
                    // It's like the background state effectively changed to "enabled with new image".
                    if (this.backgroundToggle && this.backgroundToggle.checked) {
                        this.notifyContentScript({ type: "ODEV_BACKGROUND_STATE_CHANGED", backgroundEnabled: true });
                    }
                });
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    clearStoredImage() {
        chrome.storage.local.remove(this.IMAGE_STORAGE_KEY, () => {
            console.log("Imagen eliminada de storage.");
            this.resetImageUI();
            if (this.clearButton) this.clearButton.style.display = "none";
            this.showStatus("Imagen de Fondo Eliminada", "info");

            // When image is cleared, the background (if it was using this image) should be disabled.
            // This message will tell contentScriptIsolated to send new initData with backgroundImg: null
            // and isBackgroundEnabled reflecting the toggle (or false if we force it).
            // For simplicity, let's assume clearing image means the background feature might turn off
            // if it was reliant on *this* image. The `backgroundEnabled` flag in the message
            // should reflect the `this.backgroundToggle.checked` state.
             this.notifyContentScript({
                type: "ODEV_BACKGROUND_STATE_CHANGED",
                backgroundEnabled: this.backgroundToggle ? this.backgroundToggle.checked : false // Send current toggle state
            });
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    showStatus(message, type = "info") {
        const statusTextElement = document.getElementById("statusText");
        const statusIconElement = document.getElementById("statusIcon");
        if (!statusTextElement || !statusIconElement || !this.statusMessageEl) {
            console.error("Status message elements not found.");
            return;
        }
        statusTextElement.textContent = message;
        const iconColorClasses = { success: "text-green-600", error: "text-red-600", info: "text-blue-600" };
        const newColorClass = iconColorClasses[type] || iconColorClasses.info;
        const baseIconClasses = ["w-5", "h-5"];
        Object.values(iconColorClasses).forEach(cls => statusIconElement.classList.remove(cls));
        baseIconClasses.forEach(cls => statusIconElement.classList.remove(cls)); // Also remove base if re-applying
        statusIconElement.classList.add(...baseIconClasses, newColorClass);
        this.statusMessageEl.classList.remove("hidden");
        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => {
            if (this.statusMessageEl) this.statusMessageEl.classList.add("hidden");
            this.statusTimeout = null;
        }, 3000);
    }

    notifyContentScript(messagePayload) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!(tabs && tabs.length > 0 && tabs[0].id)) {
                console.warn("Popup: No active tab found to send message to.");
                return;
            }
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, messagePayload, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn(`Popup: Error sending message type '${messagePayload.type}':`, chrome.runtime.lastError.message);
                } else {
                    console.log(`Popup: Content script response for '${messagePayload.type}':`, response);
                }
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new OdooDevTools();
});