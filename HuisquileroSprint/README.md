# HuisquileroSprint

Sistema de gestión de clínica desarrollado con **Node.js** en el backend y **HTML/CSS/JavaScript** en el frontend.

---

## Descripción del proyecto

HuisquileroSprint es una aplicación web diseñada para gestionar los procesos internos de una clínica. Permite administrar información de pacientes, consultas y demás operaciones clínicas desde una interfaz web sencilla e intuitiva.

El proyecto sigue una arquitectura **MVC (Modelo - Vista - Controlador)**, separando claramente la lógica de negocio, el acceso a datos y la presentación al usuario.

### Características principales

- Gestión de datos clínicos mediante una API REST
- Interfaz web con HTML, CSS y JavaScript
- Conexión a base de datos MySQL
- Autenticación y control de acceso mediante middleware
- Configuración de entorno con variables `.env`

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express.js |
| Frontend | HTML, CSS, JavaScript |
| Base de datos | MySQL |
| Entorno | dotenv |

---

## Instrucciones de instalación

### Prerequisitos

Asegurate de tener instalado lo siguiente antes de comenzar:

- [Node.js](https://nodejs.org/) v18 o superior
- [MySQL](https://www.mysql.com/) v8 o superior
- [Git](https://git-scm.com/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Leo7107/HuisquileroSprint.git
cd HuisquileroSprint
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Creá un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
PORT=3000
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=nombre_de_la_base_de_datos
```

>  **Importante:** Nunca subas el archivo `.env` al repositorio. Asegurate de incluirlo en el `.gitignore`.

### 4. Configurar la base de datos

Creá la base de datos en MySQL y ejecutá el script de inicialización si existe:

```sql
CREATE DATABASE nombre_de_la_base_de_datos;
```

### 5. Iniciar el servidor

```bash
node server.js
```

O si tenés `nodemon` instalado para desarrollo:

```bash
npx nodemon server.js
```

### 6. Acceder a la aplicación

Abrí tu navegador y entrá a:

```
http://localhost:3000
```

---

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos.
