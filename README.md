# 📸 SnapEdit – Screenshot & Editor

> Extensión para Chrome que captura la pantalla del navegador y permite editarla con herramientas de recorte y borrado inteligente por color adyacente.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-6366f1?style=flat)
![License](https://img.shields.io/badge/License-MIT-10b981?style=flat)

---

## ✨ Funcionalidades

| Herramienta | Descripción |
|---|---|
| 📸 **Captura de pantalla** | Captura la pestaña activa del navegador con un solo clic |
| ✂️ **Recorte rectangular** | Selecciona un área y recorta la imagen automáticamente al soltar |
| 🪄 **Borrado por color adyacente** | Rellena el área seleccionada con el color promedio del borde exterior |
| ↩️ **Deshacer** | Historial de hasta 30 acciones |
| 💾 **Guardar** | Descarga la imagen editada como PNG con timestamp |
| ⌨️ **Atajos de teclado** | Acceso rápido a todas las funciones |

---

## 🛠️ Instalación

### Requisitos previos

- Google Chrome (versión 88 o superior)
- Sin dependencias externas — funciona con APIs nativas del navegador

### Pasos de instalación

1. **Clona o descarga** este repositorio:
   ```bash
   git clone git@github.com:sociosdigitalespro/extension_google.git
   ```

2. Abre Chrome y navega a:
   ```
   chrome://extensions/
   ```

3. Activa el **Modo desarrollador** usando el toggle en la esquina superior derecha.

4. Haz clic en **"Cargar extensión sin empaquetar"** *(Load unpacked)*.

5. Selecciona la carpeta del repositorio clonado.

6. La extensión aparecerá en la barra de herramientas de Chrome con el ícono 📸.

> **Nota:** Si el ícono no aparece, haz clic en el puzzle 🧩 en la barra de Chrome y fija la extensión.

---

## 🚀 Uso

### 1. Capturar la pantalla

1. Navega a la página que deseas capturar.
2. Haz clic en el ícono **SnapEdit** en la barra de herramientas.
3. En el popup, presiona el botón **"Capturar pantalla"**.
4. Se abrirá automáticamente una nueva pestaña con el editor.

### 2. Herramienta de Recorte ✂️

1. Selecciona la herramienta **"Recorte"** en la barra superior (o presiona `C`).
2. Haz clic y arrastra sobre la imagen para seleccionar el área deseada.
3. Al soltar el ratón, la imagen se recorta automáticamente al área seleccionada.

### 3. Herramienta de Borrado 🪄

1. Selecciona la herramienta **"Borrado"** en la barra superior (o presiona `E`).
2. Haz clic y arrastra para seleccionar el elemento que deseas eliminar.
3. Al soltar, el área seleccionada se rellena con el **color promedio del borde exterior** de la selección, logrando un efecto de borrado natural sobre fondos sólidos o uniformes.

### 4. Deshacer ↩️

- Haz clic en el botón **"Deshacer"** en la barra superior.
- O usa el atajo `Ctrl + Z`.
- El contador junto al botón muestra cuántos pasos puedes deshacer (máx. 30).

### 5. Guardar 💾

- Haz clic en el botón verde **"Guardar"**.
- O usa el atajo `Ctrl + S`.
- La imagen se descarga automáticamente como `snapedit-YYYY-MM-DDTHH-MM-SS.png`.

---

## ⌨️ Atajos de teclado

| Atajo | Acción |
|---|---|
| `C` | Activar herramienta de Recorte |
| `E` | Activar herramienta de Borrado |
| `Ctrl + Z` | Deshacer última acción |
| `Ctrl + S` | Guardar imagen |

---

## 📁 Estructura del proyecto

```
extension/
│
├── manifest.json       # Configuración de la extensión (Manifest V3)
├── background.js       # Service Worker: captura y almacenamiento temporal
│
├── popup.html          # Interfaz del popup al hacer clic en el ícono
├── popup.js            # Lógica del popup
│
├── editor.html         # Página completa del editor de imágenes
├── editor.css          # Estilos del editor (dark mode premium)
├── editor.js           # Lógica completa: herramientas, historial, guardado
│
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🏗️ Arquitectura técnica

### Flujo de captura

```
Usuario clic → popup.js → chrome.runtime.sendMessage
  → background.js (Service Worker)
    → chrome.tabs.captureVisibleTab()
    → chrome.storage.session.set({ screenshot })
    → chrome.tabs.create({ url: editor.html })
      → editor.js lee storage y carga en <canvas>
```

### Canvas dual

El editor utiliza **dos capas de canvas** superpuestas:

- **`mainCanvas`** — contiene la imagen real y recibe las modificaciones permanentes.
- **`overlayCanvas`** — capa transparente que dibuja la selección en tiempo real sin alterar la imagen.

### Algoritmo de borrado (Smart Erase)

1. Al definir la selección rectangular, se muestrea un anillo de **6px de ancho fuera del rectángulo** seleccionado (en los 4 lados).
2. Se calcula el **promedio RGBA** de todos los píxeles muestreados.
3. El interior del rectángulo se rellena con ese color promedio usando `ctx.fillRect`.

> Funciona mejor con fondos de color uniforme o gradientes suaves (como capturas de páginas web, dashboards, etc.).

### Historial de deshacer

Antes de cada operación destructiva (recorte o borrado), se guarda un snapshot completo del canvas mediante `ctx.getImageData()`. El historial tiene un límite de **30 pasos** para controlar el uso de memoria.

---

## 🔒 Permisos utilizados

| Permiso | Motivo |
|---|---|
| `activeTab` | Acceder a la pestaña activa para capturarla |
| `tabs` | Crear la nueva pestaña del editor |
| `scripting` | Inyección de scripts si es necesario |
| `storage` | Almacenar temporalmente el screenshot en `session storage` |
| `<all_urls>` | Capturar cualquier página web |

> La extensión **no recopila, no envía ni almacena** ningún dato fuera del navegador. Todo el procesamiento es local.

---

## 🧩 Compatibilidad

| Navegador | Soporte |
|---|---|
| Google Chrome 88+ | ✅ Completo |
| Microsoft Edge 88+ | ✅ Completo (Chromium) |
| Brave | ✅ Completo |
| Firefox | ❌ No compatible (Manifest V3 diferente) |

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Para contribuir:

1. Haz un fork del repositorio.
2. Crea una rama para tu feature: `git checkout -b feat/nueva-herramienta`
3. Realiza tus cambios y haz commit: `git commit -m "feat: descripción"`
4. Sube la rama: `git push origin feat/nueva-herramienta`
5. Abre un Pull Request.

### Ideas para futuras mejoras

- [ ] Herramienta de texto sobre la imagen
- [ ] Herramienta de flechas y anotaciones
- [ ] Zoom en el editor
- [ ] Captura de área seleccionada (sin abrir editor)
- [ ] Soporte para múltiples capturas en pestañas
- [ ] Exportar en formato JPEG con control de calidad

---

## 📄 Licencia

MIT License — libre para usar, modificar y distribuir.

---

<div align="center">
  Hecho con ❤️ · <a href="https://github.com/sociosdigitalespro/extension_google">sociosdigitalespro/extension_google</a>
</div>
