# Medium Clone in Express.js

This project is a "clone" of the popular blogging platform Medium, built using Express.js. It provides functionalities such as user registration, login, posting articles, saving articles, and user administration.

## Features

- **User Registration and Authentication:** Users can register with a unique username and email address. Passwords are hashed using bcrypt. Authentication is implemented using session management.
  
- **Role-based Access Control:** Admins have special privileges, such as viewing all users and toggling premium status. Regular users can post articles and save articles for later reading.

- **Article Posting:** Authenticated users can create and post articles. They can specify if an article is premium content or not.

- **Article Saving:** Users can save articles to read later. Saved articles are displayed on a dedicated page.

## Setup

To run this project locally, follow these steps:

1. Clone the repository to your local machine.
2. Install dependencies using npm or yarn:
    ```
    npm install
    ```
3. Set up your environment variables by creating a `.env` file at the root of the project and define the following variables:
    ```
    DB_HOST=<your_database_host>
    DB_USER=<your_database_username>
    DB_PASSWORD=<your_database_password>
    DB_DATABASE=<your_database_name>
    ```
4. Run the application:
    ```
    npm start
    ```

The application will be accessible at `http://localhost:3000` by default.

## Endpoints and Functionality

- **GET /register:** Displays the registration form for new users.
- **POST /register:** Handles user registration. Validates input fields and saves new users to the database.
- **GET /login:** Displays the login form for existing users.
- **POST /login:** Handles user login. Validates credentials and creates a session for authenticated users.
- **GET /logout:** Logs out the current user and destroys the session.
- **GET /users:** Displays a list of all users (accessible only to admins).
- **GET /:** Displays the home page with a list of articles. Premium articles are displayed only to premium users.
- **POST /:** Handles article creation. Validates input fields and saves articles to the database.
- **POST /toggle-premium/:userId:** Toggles the premium status of a user (accessible only to admins).
- **POST /add-medium/:userId/:mediumId:** Saves or removes an article to/from a user's saved list.
- **GET /saved-mediums/:userId:** Displays a list of saved articles for a specific user.
