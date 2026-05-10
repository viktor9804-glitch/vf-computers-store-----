# ВФ Компютри - V18 Admin Desktop App

## Какво е добавено
- Публичният сайт остава без „Админ“
- Админ панелът е отделно desktop приложение
- Папка: `vf-admin-app`
- Electron desktop wrapper
- Windows installer build чрез electron-builder

## Как да го стартираш

Влез в:

```txt
vf-admin-app
```

После:

```bash
npm install
npm run desktop
```

## Как да направиш .exe installer

```bash
npm run dist
```

Готовият installer ще е в:

```txt
vf-admin-app/release/
```

## Най-лесно
Може да използваш файловете:
- `START_ADMIN_DESKTOP.bat`
- `BUILD_WINDOWS_INSTALLER.bat`
