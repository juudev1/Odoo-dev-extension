
document.addEventListener('DOMContentLoaded', function () {
    const uploadImage = document.getElementById('uploadImage');
    const saveImage = document.getElementById('saveImage');
    const previewImage = document.getElementById('previewImage');
    const uploadArea = document.getElementById('uploadArea');
    const uploadText = document.getElementById('uploadText');
    const fileInfo = document.getElementById('fileInfo');

    let selectedFile = null;

    // Función para mostrar la vista previa
    function showPreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');

                // Actualizar la información del archivo
                const fileName = file.name;
                const fileSize = (file.size / 1024).toFixed(2) + ' KB';
                fileInfo.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                    ${fileName} (${fileSize})
                `;

                uploadArea.classList.add('file-selected');
                saveImage.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    // Evento cuando se selecciona un archivo
    uploadImage.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            showPreview(file);
        }
    });

    // Evento para guardar la imagen
    saveImage.addEventListener('click', function () {
        if (selectedFile) {
            // Añadir clase de carga
            this.classList.add('loading');

            // Simular proceso de guardado
            setTimeout(() => {
                // Aquí iría tu lógica real de guardado

                // Quitar clase de carga
                this.classList.remove('loading');

                // Mostrar mensaje de éxito
                alert('Imagen guardada exitosamente');
            }, 1500);
        }
    });

    // Prevenir el comportamiento por defecto del drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Resaltar área cuando se arrastra un archivo
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        uploadArea.classList.add('file-selected');
    }

    function unhighlight(e) {
        uploadArea.classList.remove('file-selected');
    }

    // Manejar el drop
    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];

        if (file && file.type.startsWith('image/')) {
            selectedFile = file;
            showPreview(file);
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const uploadInput = document.getElementById("uploadImage");
    const saveButton = document.getElementById("saveImage");
    const previewImage = document.getElementById("previewImage");

    // Cargar la imagen almacenada si existe
    chrome.storage.local.get(["odoo_bg"], function (result) {
        if (result.odoo_bg) {
            previewImage.src = result.odoo_bg;
        }
    });

    saveButton.addEventListener("click", function () {
        const file = uploadInput.files[0];
        if (!file) {
            alert("Selecciona una imagen primero.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const imageData = e.target.result;

            // Guardar la imagen en storage
            chrome.storage.local.set({ odoo_bg: imageData }, function () {
                console.log("Imagen guardada.");
                previewImage.src = imageData; // Actualizar vista previa
                alert("Imagen guardada exitosamente.");
            });
        };

        reader.readAsDataURL(file);
    });
});
