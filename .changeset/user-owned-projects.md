---
"api": minor
"ui": minor
---

Add user-owned projects for organizing NEAR apps

- Add projects database schema with projects and project_apps tables
- Add ProjectService with Effect pattern for proper dependency injection
- Add 8 project API endpoints: list, get, create, update, delete, list apps, link/unlink apps
- Add UI pages for project detail, project creation, and project listings
- Add "My Projects" section to home page
- Add "In Projects" section to app detail page showing which projects contain the app
