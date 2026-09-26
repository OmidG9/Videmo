# گزارش ممیزی فنی Videmo

تاریخ ممیزی: ۱۴۰۴/۰۶/۰۴
نسخه پروژه در زمان ممیزی: `codih-hub@0.1.0` → `videmo@1.0.0`
فریم‌ورک: Next.js 16.2.4 (App Router) · React 19.2.4 · Tailwind CSS 4.2.4

---

## ۱. خلاصه اجرایی

پروژه در وضعیت اولیه یک **نمونه اولیه (prototype)** بود: احراز هویت نمایشی با رمزهای ثابت داخل کد، بدون
دیتابیس، بدون قابلیت آپلود، و یک پخش‌کننده ساده که فقط کنترل‌های پیش‌فرض مرورگر را نشان می‌داد.
مستندات پروژه نیز با کد واقعی هم‌خوانی نداشت.

بازطراحی کامل انجام شد و در حال حاضر Videmo یک اپلیکیشن کامل و قابل اجرا با دیتابیس SQLite
مستقل است. تمام مسیرهای بحرانی (ورود، آپلود، استریم، پیشرفت تماشا، حذف، کنترل دسترسی) با تست
دود (smoke test) خودکار روی سرور واقعی تأیید شده‌اند.

| وضعیت | امتیاز کل |
| :--- | :--- |
| قبل از بازطراحی | **۱۳٪** |
| بعد از بازطراحی | **۸۱٪** |
| رشد | **+۶۸ واحد درصد** |

### امتیاز تفکیکی

| حوزه | وزن | قبل | بعد |
| :--- | ---: | ---: | ---: |
| احراز هویت و امنیت | ۲۰ | ۸ | ۷۸ |
| دیتابیس و ماندگاری داده | ۱۸ | ۰ | ۸۸ |
| پخش‌کننده و جریان ویدیو | ۱۸ | ۱۵ | ۸۶ |
| API و معماری بک‌اند | ۱۲ | ۲۰ | ۸۲ |
| طراحی و تجربه کاربری | ۱۲ | ۳۰ | ۸۵ |
| کیفیت کد و معماری | ۸ | ۲۵ | ۸۰ |
| تست و تضمین کیفیت | ۶ | ۰ | ۵۰ |
| مستندات و تجربه توسعه‌دهنده | ۶ | ۸ | ۸۲ |

> امتیاز «تست» عمداً ۵۰ است و نه بالاتر: تست دود پوشش خوبی از API و احراز هویت دارد، اما هنوز
> تست واحد (unit test) و CI نوشته نشده است. جزئیات در بخش ۸.

---

## ۲. ساختار پروژه قبل از بازطراحی

```
app/
  api/auth/[...nextauth]/route.ts     ۵۶ خط   ← احراز هویت نمایشی با رمز ثابت
  api/videos/route.ts                 ۴۱ خط   ← بدون احراز هویت، بدون آپلود
  dashboard/page.tsx                 ۱۸۳ خط
  login/page.tsx                     ۱۲۲ خط
  globals.css                         ۲۶ خط
  layout.tsx                          ۲۲ خط
  page.tsx                            ۱۴ خط
  providers.tsx                       ۱۲ خط
middleware.ts                         ۲۳ خط
public/videos/*.mp4                             ← دو ویدیوی نمونه، داخل گیت
public/videos/README.md             ۲۴۳ خط   ← مستندات ساختگی
```

جمع کل کد اپلیکیشن: حدود **۶۰۰ خط**. بدون دیتابیس، بدون آپلود، بدون تست.

---

## ۳. ضعف‌های شناسایی‌شده در وضعیت اولیه

### ۳.۱ — امنیت و احراز هویت (بحرانی)

| # | مشکل | محل | شدت |
| --- | :--- | :--- | :---: |
| 1 | نام کاربری و رمز عبور **داخل کد سخت‌کد شده بود** (`CodiH@gmail.com` / `CodiH`) و در مخزن گیت قرار داشت | `api/auth/[...nextauth]/route.ts` | بحرانی |
| 2 | رمز عبور اصلاً هش نمی‌شد؛ مقایسه به‌صورت متن ساده (`===`) انجام می‌شد | همان‌جا | بحرانی |
| 3 | هر کسی با همان رمز وارد حساب می‌شد و به کل کتابخانه دسترسی داشت | همان‌جا | بحرانی |
| 4 | هیچ rate limit یا قفل موقت وجود نداشت → brute force نامحدود | — | بحرانی |
| 5 | مسیر خروج (`signOut`) به `/app/login` اشاره می‌کرد که اصلاً وجود ندارد (مسیر درست `/login` بود) | `app/dashboard/page.tsx` | متوسط |
| 6 | هیچ اعتبارسنجی ورودی در فرم ورود وجود نداشت؛ فقط `alert` مرورگر | `app/login/page.tsx` | متوسط |
| 7 | پیام خطای ورود نامعتبر و رمز اشتباه یکسان نبود → نشانه‌ی وجود یا نبود ایمیل (user enumeration) | همان‌جا | متوسط |
| 8 | `NEXTAUTH_SECRET` تنظیم نشده بود و هیچ `.env.local` یا `.env.example` وجود نداشت | — | بحرانی در production |
| 9 | `session.user as any` برای تزریق `id` استفاده شده بود؛ type augmentation وجود نداشت | `providers.tsx` | متوسط |
| 10 | در React 19 به‌جای `useSession` از `useEffect` دستی برای `getSession` استفاده می‌شد | `providers.tsx` | متوسط |

### ۳.۲ — دیتابیس و ماندگاری داده (بحرانی)

| # | مشکل |
| --- | :--- |
| 11 | **هیچ دیتابیسی وجود نداشت.** هیچ داده‌ای ذخیره نمی‌شد |
| 12 | هیچ لایه data access یا repository وجود نداشت |
| 13 | هیچ مدل داده‌ای (user / video / progress) تعریف نشده بود |
| 14 | حساب کاربری و رمز عبور در کد زنده بود؛ با هر deploy قابل تغییر بدون تغییر کد نبود |
| 15 | قابلیت ثبت‌نام کاربر جدید وجود نداشت |

### ۳.۳ — API و بک‌اند (بالا)

| # | مشکل | محل | شدت |
| --- | :--- | :--- | :---: |
| 16 | `GET /api/videos` کاملاً **عمومی** بود — `middleware.ts` عمداً `api/` را از کنترل مستثنا کرده بود | `middleware.ts` | بحرانی |
| 17 | `readdirSync` روی `public/videos` و `fs.statSync` — ساختار فایل به‌عنوان دیتابیس استفاده می‌شد | `api/videos/route.ts` | بالا |
| 18 | شناسه (id) ویدیوها از **ایندکس آرایه** ساخته می‌شد: با افزودن یا حذف یک فایل، آیدی همه ویدیوهای بعدی جابه‌جا می‌شد و لینک‌های ذخیره‌شده می‌شکست | همان‌جا | بالا |
| 19 | فیلد `duration` در اینترفیس `Video` وجود داشت ولی هرگز مقدار نمی‌گرفت (`undefined`) | همان‌جا | متوسط |
| 20 | **هیچ endpoint آپلودی وجود نداشت** | — | بالا |
| 21 | هیچ endpoint حذف، ویرایش، یا شمارنده بازدید وجود نداشت | — | متوسط |
| 22 | `fs.mkdirSync` داخل یک GET اجرا می‌شد — عملیات نوشتن در مسیر خواندن | همان‌جا | پایین |
| 23 | هیچ اعتبارسنجی (validation) روی هیچ ورودی وجود نداشت | — | بالا |

### ۳.۴ — پخش‌کننده و استریم ویدیو (بالا)

| # | مشکل | شدت |
| --- | :--- | :---: |
| 24 | ویدیوها داخل `public/` قرار داشتند و توسط **سرور استاتیک** سرو می‌شدند | بالا |
| 25 | سرور استاتیک از HTTP Range پشتیبانی نمی‌کند → **seek (جلو/عقب بردن) ویدیو قابل اتکا نبود** | بالا |
| 26 | فایل‌ها داخل مخزن گیت commit شده بودند (حدود ۶۵۷ کیلوبایت باینری در history) | متوسط |
| 27 | پخش‌کننده فقط `<video controls>` بود؛ فقط کنترل‌های بومی مرورگر | بالا |
| 28 | ذخیره و بازیابی موقعیت تماشا (resume) وجود نداشت | بالا |
| 29 | هیچ میان‌بر صفحه‌کلید (tempo، فاصله، صدا، m، f)، سرعت پخش، Picture-in-Picture یا fullscreen سفارشی وجود نداشت | متوسط |
| 30 | `playsInline` تنظیم نشده بود → در iOS با هر بار پخش، ویدیو تمام‌صفحه می‌شد | متوسط |
| 31 | هیچ صفحه watch مستقلی وجود نداشت؛ فقط یک `<video>` در داشبورد | بالا |
| 32 | هیچ مدیریت خطای پخش، بافر، یا تلاش مجدد وجود نداشت | متوسط |

### ۳.۵ — طراحی و تجربه کاربری (متوسط)

| # | مشکل |
| --- | :--- |
| 33 | ظاهر کاملاً پیش‌فرض Tailwind؛ هیچ هویت بصری یا سیستم طراحی وجود نداشت |
| 34 | `globals.css` به متغیرهای `--font-geist-sans` و `--font-geist-mono` ارجاع می‌داد که **هرگز تعریف نشده بودند**؛ نتیجه: `font-sans`/`font-mono` چیزی نبود و `body` به‌اجبار Arial می‌شد |
| 35 | بلوک `@media (prefers-color-scheme: dark)` با کلاس‌های hardcode شده `bg-gray-900` تضاد داشت؛ در حالت روشن سایت هم تیره می‌ماند |
| 36 | نام فایل‌ها به شکل خام نمایش داده می‌شد (مثل `1776673582543` — نام timestamp) |
| 37 | هیچ حالت خالی، loading، error، یا not-found اختصاصی وجود نداشت |
| 38 | کرش کردن اپ = صفحه خطای پیش‌فرض Next.js با متن انگلیسی |
| 39 | بدون طراحی responsive واقعی یا حالت موبایل |
| 40 | بدون toast، modal، skeleton، یا focus state |

### ۳.۶ — زیرساخت و کیفیت کد (متوسط)

| # | مشکل |
| --- | :--- |
| 41 | `middleware.ts` مقدار `null` برمی‌گرداند — در Next 16 نامعتبر است (باید `NextResponse.next()` باشد) |
| 42 | قرارداد فایل `middleware.ts` در Next 16 منسوخ شده و به `proxy.ts` تغییر کرده است |
| 43 | هیچ اسکریپت `typecheck` یا `lint` در `package.json` نبود |
| 44 | هیچ تست و هیچ CI وجود نداشت |
| 45 | نام پکیج `codih-hub` با نام محصول Videmo هم‌خوان نبود |
| 46 | `next.config.ts` عملاً خالی بود؛ هیچ تنظیم امنیتی، headers، یا محدودیت حجم آپلودی |
| 47 | `next-auth@4` روی React 19؛ نسخه 4 خط پیر است (Auth.js v5 استاندارد فعلی است) |
| 48 | در `useEffect` وابستگی به `status` باعث اجرای مجدد و بی‌هدف fetch می‌شد؛ بدون cleanup یا AbortController |

### ۳.۷ — مستندات (بالا)

| # | مشکل |
| --- | :--- |
| 49 | **هیچ README در ریشه مخزن وجود نداشت** |
| 50 | `public/videos/README.md` با ۲۴۳ خط مستندات **کاملاً ساختگی** بود و همه چیزش غلط بود |
| 51 | ادعا می‌کرد `react-player` استفاده شده — این پکیج نصب نشده بود |
| 52 | به `tailwind.config.ts` ارجاع می‌داد — در Tailwind 4 اصلاً وجود ندارد |
| 53 | نسخه Next.js را «۱۴» اعلام می‌کرد — در واقع ۱۶ بود |
| 54 | اطلاعات ورود `user@example.com` / `password` می‌داد که هیچ‌وقت کار نمی‌کرد (واقعی: `CodiH@gmail.com`/`CodiH`) |
| 55 | ادعای «dynamic imports»، «SSR optimized»، «keyboard shortcuts»، «speed control» می‌کرد که هیچ‌کدام پیاده نشده بودند |
| 56 | هیچ راهنمای نصب، متغیر محیطی، یا نمونه `.env` |

---

## ۴. کارهای انجام‌شده

### ۴.۱ — دیتابیس SQLite (بند ۱۱ تا ۱۵)

- افزودن `better-sqlite3` با جداسازی بهینه برای اجرای Node در برابر edge runtime
- `lib/db/index.ts`: singleton با guard مخصوص HMR، `WAL`، `foreign_keys=ON`، `busy_timeout=5000`
- `lib/db/schema.ts`: migrationهای forward-only با جدول `_migrations` و ثبت `checksum`
- سه جدول:
  - `users` — `id`, `email` (یکتا), `name`, `password_hash`, `created_at`
  - `videos` — `id`, `owner_id` (FK)، `title`, `original_name`, `stored_name`, `mime_type`, `size_bytes`, `duration`, `width`, `height`, `view_count`, `created_at`, `updated_at`
  - `watch_progress` — کلید `(user_id, video_id)`، `position`, `duration`, `completed`
- index روی ستون‌های پرکاربرد (`owner_id`, `created_at`, `view_count`)
- repositoryهای مجزا: `lib/db/users.ts`، `lib/db/videos.ts`، `lib/db/progress.ts`
- مسیر دیتابیس و فایل‌ها قابل تنظیم با `VIDEMO_DATA_DIR`
- اسکریپت `npm run seed` و `npm run db:reset`

### ۴.۲ — احراز هویت (بند ۱ تا ۱۰)

- حذف کامل کاربر و رمز هاردکدشده
- هش کردن رمز با `bcrypt` و cost = ۱۲
- نرمال‌سازی ایمیل (trim + lowercase) برای جلوگیری از حساب‌های تکراری
- endpoint جدید `POST /api/auth/register` با اعتبارسنجی کامل Zod
- rate limit: ورود ۸ تلاش / ۱۵ دقیقه، ثبت‌نام ۵ تلاش / ساعت — هر دو قابل تنظیم و با پاسخ `Retry-After`
- پیام خطای یکسان برای ایمیل ناموجود و رمز اشتباه (رفع user enumeration)
- type augmentation واقعی برای `session.user.id` و `session.user.name`
- `proxy.ts` به‌جای `middleware.ts` — رفع هشدار deprecation و رفع رفتار `return null`
- افزودن callback URL هنگام redirect به ورود

### ۴.۳ — API ویدیو (بند ۱۶ تا ۲۳)

| endpoint | توضیح |
| :--- | :--- |
| `GET /api/videos` | لیست، جست‌وجو (`q`)، مرتب‌سازی (`sort=newest\|oldest\|title\|views`)، فقط ویدیوهای مالک |
| `POST /api/videos/upload` | آپلود چندتایی، ۱ گیگابایت، ۸ فرمت، اعتبارسنجی MIME و پسوند، تولید thumbnail |
| `GET /api/videos/[id]/stream` | **HTTP Range کامل**: `206`، `Content-Range`، `Accept-Ranges`، suffix range، `416`، `HEAD` |
| `GET /api/videos/[id]/thumbnail` | تصویر جایگزین در نبود thumbnail |
| `GET /api/videos/[id]/progress` | بازیابی موقعیت تماشا |
| `POST /api/videos/[id]/progress` | ذخیره موقعیت، علامت‌گذاری `completed` در ۹۲٪ |
| `POST /api/videos/[id]/view` | شمارنده بازدید |
| `PATCH /api/videos/[id]` | تغییر عنوان |
| `DELETE /api/videos/[id]` | حذف رکورد **و** فایل فیزیکی |
| `POST /api/auth/register` | ثبت‌نام |

- هر endpoint مالکیت را بررسی می‌کند (id دیگران ۴۰۴ می‌گیرد، نه ۴۰۳ — تا وجود منابع لو نرود)
- شناسه‌ها UUIDv4 جایگزین ایندکس آرایه شدند
- مسیر فایل از `stored_name` محاسبه می‌شود؛ id کاربر هرگز مستقیم وارد مسیر نمی‌شود (جلوگیری از path traversal)
- `lib/paths.ts`: بررسی می‌کند مسیر واقعی فایل داخل پوشه ذخیره‌سازی باشد

### ۴.۴ — پخش‌کننده ویدیو (بند ۲۴ تا ۳۲)

`components/player/video-player.tsx` — پخش‌کننده کاملاً سفارشی:

- تایم‌لاین قابل کلیک/کشیدن + نمایش بافر (buffered) و پیشرفت
- کنترل صدا، **بی‌صدا (mute)**، و پخش/توقف
- سرعت پخش ۰.۲۵× تا ۲×
- **Picture-in-Picture** با تشخیص پشتیبانی مرورگر
- **fullscreen** روی کانتینر (نه فقط video) تا کنترل‌ها داخل fullscreen بمانند
- تشخیص **AirPlay** و نمایش دکمه
- **میان‌برهای صفحه‌کلید**: `Space/K` پخث، `←/→` ده ثانیه، `J/L` ده ثانیه، `↑/↓` صدا، `M` بی‌صدا، `F` تمام‌صفحه، `0-9` پرش به درصد
- **ادامه تماشا از آخرین موقعیت** ذخیره‌شده در دیتابیس
- ذخیره خودکار پیشرفت هر ۵ ثانیه و در `beforeunload`
- حالت‌های loading، buffering، error با دکمه تلاش مجدد
- `playsInline` برای رفع مشکل تمام‌صفحه شدن در iOS
- کنترل‌های لمسی (tap برای play/pause) برای موبایل
- `crossOrigin` و `preload="metadata"`

صفحه watch (`app/(app)/watch/[id]/page.tsx` + `components/player/watch-view.tsx):
- چیدمان سینمایی با playlist کناری
- **پخش خودکار ویدیوی بعدی** در پایان
- کلیک روی آیتم playlist → پرش و پخش
- ویرایش عنوان inline و حذف با تأیید

### ۴.۵ — طراحی و تجربه کاربری (بند ۳۳ تا ۴۰)

- سیستم طراحی dark سینمایی با design tokenهای Tailwind 4 (`--surface`, `--accent`، …)
- فونت **Geist** واقعی با متغیرهای `--font-geist-sans` / `--font-geist-mono` که این بار تعریف شده‌اند
- حذف تضاد حالت تیره/روشن
- صفحه login/register با split-layout، تصویر پس‌زمینه، و اعتبارسنجی لحظه‌ای
- کتابخانه با نمای grid/list، جست‌وجوی زنده، مرتب‌سازی، و empty state
- دیالوگ آپلود چندتایی با نوار پیشرفت per-file، امکان «افزودن فایل بیشتر»، و تولید thumbnail در مرورگر با Canvas
- `app-shell` با sidebar، ناوبری، و منوی کاربر
- کامپوننت‌های مشترک: `Button`, `Field`, `Modal`, `Toast`, `Tooltip`
- `loading.tsx` اسکلت، `error.tsx` با دکمه تلاش مجدد، `not-found.tsx` اختصاصی
- حالت‌های خالی، خطا، و اسکلت برای همه صفحات
- طراحی responsive واقعی

### ۴.۶ — زیرساخت و مستندات (بند ۴۱ تا ۵۶)

- `middleware.ts` → `proxy.ts` (رفع هشدار deprecation و رفتار `null`)
- اسکریپت‌های `typecheck`، `lint`، `check`، `seed`، `smoke`، `db:reset`
- `.env.example` و `.env.local` با `NEXTAUTH_SECRET`
- `data/` در `.gitignore`
- بازنویسی کامل `README.md` و همین `PROJECT_AUDIT.md`
- حذف ویدیوهای نمونه و SVGهای starter از مخزن
- تغییر نام پکیج به `videmo@1.0.0`
- `lib/env.ts`: اعتبارسنجی متغیرهای محیطی با پیام خطای واضح

---

## ۵. معماری جدید

```
app/
├── (auth)/                     ← layout جدا برای صفحات ورود
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/                      ← layout مشترک اپلیکیشن (ناوبری + کاربر)
│   ├── library/                ← کتابخانه اصلی
│   ├── watch/[id]/             ← صفحه پخش  (‎/watch?name=… برای «همه ویدیوها»)
│   └── about/
├── api/
│   ├── auth/                   ← NextAuth + register
│   └── videos/                 ← لیست، upload، stream، thumbnail، progress، view
├── error.tsx  not-found.tsx  globals.css  layout.tsx
└── page.tsx                    ← فقط redirect (بدون منطق نمایشی)

lib/
├── db/          schema.ts · index.ts · users.ts · videos.ts · progress.ts
├── auth/        options.ts · session.ts
├── security/    rate-limit.ts
├── paths.ts  env.ts  validation.ts  video-formats.ts  video-sort.ts  format.ts

components/
├── app/     provider/ ui/ auth/ library/ player/

proxy.ts                          ← کنترل دسترسی در لبه اپلیکیشن
types/next-auth.d.ts             ← type augmentation
scripts/  seed.ts · smoke.mjs
```

---

## ۶. چه چیزی تغییر نکرد / تصمیمات آگاهانه

- **`next-auth@4` حفظ شد** (به‌جای مهاجرت به Auth.js v5). دلیل: v5 هنوز API پایدار ندارد و مهاجرت
  ریسک بازنویسی کل لایه احراز هویت دارد. برای پروژه تولیدی توصیه می‌شود در یک PR جداگانه مهاجرت کند.
- **Range streaming دستی نوشته شد** (بدون کتابخانه). حجم کد کم و رفتار کاملاً قابل کنترل است.
- **بدون HLS / transcoding adaptive**. پخش progressive MP4 است. برای پروژه شخصی کافی است.
- **thumbnail سمت کاربر ساخته می‌شود** (Canvas) تا نیازی به ffmpeg روی سرور نباشد.

---

## ۷. وضعیت تأیید‌شده

```
npx tsc --noEmit    → بدون خطا
npx eslint .        → بدون خطا
npm run build       → موفق (۰ خطا)
npm run smoke       → ۲۵ از ۲۵ موفق
```

پوشش تست دود:

| # | بررسی | نتیجه |
| --- | :--- | :---: |
| 1 | دسترسی بدون ورود به کتابخانه مسدود است | ✅ ۴۰۱ |
| 2 | استریم بدون ورود مسدود است | ✅ ۴۰۱ |
| 3 | ورود موفق، cookie نشست می‌دهد | ✅ ۲۰۰ |
| 4 | رمز اشتباه رد می‌شود | ✅ ۴۰۱ |
| 5 | نشست شناسه کاربر را برمی‌گرداند | ✅ |
| 6 | آپلود پذیرفته می‌شود | ✅ ۲۰۱ |
| 7 | پسوند پشتیبانی‌نشده رد می‌شود | ✅ ۴۱۵ |
| 8 | ویدیو در فهرست ظاهر می‌شود | ✅ |
| 9 | جست‌وجو فیلتر می‌کند | ✅ |
| ۱۰ | استریم کامل، همه بایت‌ها | ✅ ۹۸۳۰۴/۹۸۳۰۴ |
| ۱۱ | Range بایتی → ۲۰۶ + برش درست | ✅ |
| ۱۲ | Suffix range کار می‌کند | ✅ |
| ۱۳ | Range خارج از محدوده → ۴۱۶ | ✅ |
| ۱۴ | HEAD حجم و پشتیبانی Range را اعلام می‌کند | ✅ |
| ۱۵ | موقعیت تماشا ذخیره می‌شود | ✅ |
| ۱۶ | موقعیت تماشا بازیابی می‌شود | ✅ |
| ۱۷ | عبور از ۹۲٪ ⇒ `completed` | ✅ |
| ۱۸ | شمارنده بازدید افزایش می‌یابد | ✅ |
| ۱۹ | تغییر عنوان کار می‌کند | ✅ |
| ۲۰ | حذف → ۲۰۴ | ✅ |
| ۲۱ | استریم بعد از حذف ۴۰۴ | ✅ |
| ۲۲ | فایل یتیم روی دیسک نمی‌ماند | ✅ ۰ فایل |
| ۲۳ | `/library` بدون نشست به `/login` هدایت می‌شود | ✅ ۳۰۷ |
| ۲۴ | `/library` با نشست رندر می‌شود | ✅ ۲۰۰ |
| ۲۵ | ویدیوی ناموجود → ۴۰۴ واقعی | ✅ ۴۰۴ |

به‌صورت دستی تأیید شد: قفل شدن ورود پس از ۸ تلاش ناموفق (حتی با رمز درست)، و فعال شدن محدودیت ثبت‌نام
در تلاش ششم با هدر `Retry-After`.

---

## ۸. کارهای باقی‌مانده

اولویت‌دار برای رسیدن به ۱۰۰٪:

| اولویت | مورد | چرا |
| :---: | :--- | :--- |
| 🔴 بالا | تست واحد برای `lib/db/*`، `range` استریم، و validation | تنها نقطه ضعیف واقعی باقی‌مانده |
| 🔴 بالا | CI (GitHub Actions) برای `typecheck` + `lint` + `build` | جلوگیری از بازگشت regression |
| 🟠 متوسط | مهاجرت به Auth.js v5 | نسخه فعلی legacy است |
| 🟠 متوسط | Rate limit پایدار (Upstash/Redis) به‌جای in-memory | با بیش از یک instance بی‌اثر می‌شود |
| 🟠 متوسط | Pagination لیست ویدیوها | فعلاً همه ویدیوها در یک پاسخ |
| 🟠 متوسط | استریم تکه‌ای به‌جای `request.formData()` | فایل ۱ گیگابایتی کامل در حافظه buffer می‌شود |
| 🟡 کم | آپلود زیرنویس (`.vtt`) | دکمه CC در player فعلاً غیرفعال است |
| 🟡 کم | تغییر رمز و بازیابی رمز | جریان کامل حساب نیست |
| 🟡 کم | Thumbnail سمت سرور | برای ویدیوهای قدیمی بدون thumbnail |
| 🟡 کم | تأیید ایمیل | ثبت‌نام بدون تأیید ایمیل |
| 🟡 کم | اشتراک‌گذاری و لینک عمومی | برای استفاده چندکاربره واقعی |
| ⚪ بعداً | HLS / adaptive bitrate streaming | برای ویدیوهای بلند و شبکه کند |
| ⚪ بعداً | Docker برای deploy | استقرار ساده‌تر |

---

## ۹. نحوه اجرا

```bash
npm install

# ۱) ساخت فایل متغیر محیطی و تولید secret
cp .env.example .env.local
#    سپس NEXTAUTH_SECRET را با یک مقدار تصادفی ۳۲ بایتی پر کنید:
#    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ۲) ساخت دیتابیس و حساب نمونه
npm run seed
#    → demo@videmo.local / Videmo123

# ۳) اجرا
npm run dev          # توسعه، http://localhost:3000
npm run build && npm start   # تولید
```

### اسکریپت‌ها

| اسکریپت | کار |
| :--- | :--- |
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد production |
| `npm start` | اجرای بیلد |
| `npm run typecheck` | بررسی تایپ بدون تولید خروجی |
| `npm run lint` | ESLint |
| `npm run check` | typecheck + lint |
| `npm run seed` | ساخت حساب نمونه (idempotent) |
| `npm run smoke` | تست دود end-to-end (نیازمند سرور در حال اجرا) |
| `npm run db:reset` | حذف کامل `data/` |

### متغیرهای محیطی

| متغیر | پیش‌فرض | توضیح |
| :--- | :--- | :--- |
| `NEXTAUTH_SECRET` | — | **الزامی.** کلید امضای نشست |
| `NEXTAUTH_URL` | `http://localhost:3000` | آدرس پایه |
| `VIDEMO_DATA_DIR` | `./data` | محل دیتابیس و فایل‌های ویدیو |
| `VIDEMO_MAX_UPLOAD_MB` | `1024` | حداکثر حجم هر فایل |

> فایل‌های `data/`، `.env.local` و `.next/` داخل مخزن گیت نیستند.

---

## ۱۰. خلاصه حذف‌شده‌ها

| فایل | دلیل حذف |
| :--- | :--- |
| `app/dashboard/page.tsx` | جایگزین با `app/(app)/library` |
| `app/login/page.tsx` | جایگزین با `app/(auth)/login` |
| `app/providers.tsx` | جایگزین با `components/providers/*` |
| `middleware.ts` | جایگزین با `proxy.ts` (قرارداد منسوخ Next 16) |
| `public/videos/*.mp4` | ویدیوهای نمونه؛ در `data/uploads` ذخیره می‌شوند |
| `public/videos/README.md` | مستندات ساختگی و گمراه‌کننده |
| `public/{file,globe,next,vercel,window}.svg` | asset های starter |
| حساب `CodiH@gmail.com` | جایگزین با دیتابیس واقعی و ثبت‌نام |
