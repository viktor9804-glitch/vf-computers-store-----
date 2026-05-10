# VF Computers Admin Desktop App

Това е отделна desktop програма за Windows.

## Стартиране като програма

В папката `vf-admin-app` отвори Command Prompt и изпълни:

```bash
npm install
npm run desktop
```

Или двоен клик върху:

```txt
START_ADMIN_DESKTOP.bat
```

## Създаване на истински Windows installer

След като си пуснал `npm install`, изпълни:

```bash
npm run dist
```

Или двоен клик върху:

```txt
BUILD_WINDOWS_INSTALLER.bat
```

Инсталаторът ще се появи в:

```txt
vf-admin-app/release/
```

Файлът ще бъде подобен на:

```txt
VF-Computers-Admin-Setup-18.0.0.exe
```

## Важно

Админ програмата използва Supabase Auth.
Трябва да имаш админ потребител в:

```txt
Supabase → Authentication → Users → Add user
```
