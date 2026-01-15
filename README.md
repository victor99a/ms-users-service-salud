# Microservicio de Usuarios - Salud Al Día 

Este microservicio se encarga de la gestión de autenticación y perfiles médicos para la plataforma **Salud Al Día**. Está construido con **Node.js**, **Express** y utiliza **Supabase** como base de datos y sistema de autenticación.

##  Tecnologías Utilizadas

* **Node.js & Express**: Entorno de ejecución y framework para la API.
* **Supabase Auth**: Manejo de registro y login de usuarios.
* **Supabase Database**: Almacenamiento de fichas médicas en PostgreSQL.
* **CORS**: Configurado para permitir peticiones desde el frontend en Railway.

##  Instalación y Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/victor99a/ms-users-service-salud.git](https://github.com/victor99a/ms-users-service-salud.git)
    cd ms-users-service-salud
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Variables de Entorno:**
    Crea un archivo `.env` en la raíz con las siguientes claves (puedes obtenerlas de tu panel de Supabase):
    ```env
    SUPABASE_URL=tu_url_de_supabase
    SUPABASE_ANON_KEY=tu_anon_key
    PORT=3000
    ```

4.  **Iniciar el servidor:**
    ```bash
    npm start
    ```

##  Endpoints de la API

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| **POST** | `/auth/signup` | Registra un nuevo usuario en Supabase Auth. |
| **POST** | `/auth/login` | Inicia sesión y devuelve un token de acceso. |
| **POST** | `/medical/records` | Guarda la ficha médica inicial del usuario. |

## 🚢 Despliegue en Railway

Este servicio está optimizado para ser desplegado en **Railway**.

* **Puerto**: El servicio escucha en el puerto definido por la variable de entorno `PORT` (por defecto 3000).
* **CORS**: La API acepta peticiones de todos los orígenes (`*`) para facilitar la conexión con el frontend desplegado.
* **URL de Producción**: `https://ms-users-service-salud-production.up.railway.app`.

##  Estructura del Proyecto

* `src/index.js`: Punto de entrada de la aplicación y configuración de rutas.
* `src/supabase.js`: Configuración del cliente de Supabase.
* `package.json`: Definición de dependencias y scripts de inicio.
