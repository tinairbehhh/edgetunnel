Deployment URL Query
Loading...
log 

Thought Process
پیدا شد! خطای واقعی این است:

text
sh: 1: npm: not found
این خطا ده‌ها بار در لاگ runtime تکرار شده. یعنی کانتینر start می‌شود، سعی می‌کند npm start اجرا کند، اما npm در image وجود ندارد و کانتینر crash می‌کند → Hostless دوباره restart می‌کند → دوباره crash → این چرخه تکرار می‌شود.

علت اصلی
Hostless از Railpack استفاده می‌کند که با دیدن package.json، start command را به‌صورت پیش‌فرض npm start انتخاب می‌کند. اما image runtime که Railpack می‌سازد (احتمالاً یک image سبک Node بدون npm) شامل npm نیست. در حالی که Dockerfile شما با node:20-slim که npm دارد، استفاده نمی‌شود چون Railpack به‌جای Dockerfile از auto-detection استفاده می‌کند.

راه‌حل (دو گام)
گام ۱ — Start command را دستی تنظیم کنید
به صفحه‌ی App → Configuration → بخش Build بروید و این فیلدها را تنظیم کنید:

فیلد
مقدار
Build type	Docker (نه Auto-detect)
Start command	node server.js (نه npm start)
Dockerfile path	Dockerfile

این دو تغییر کل مشکل را حل می‌کند:

با Build type: Docker، Hostless از node:20-slim شما استفاده می‌کند که npm دارد.
با Start command: node server.js، کانتینر مستقیماً Node را اجرا می‌کند و به npm نیاز نیست.
گام ۲ — redeploy کنید
بعد از ذخیره‌ی تنظیمات، یک redeploy بزنید.

اگر منوی Build type در Hostless ندارید
گاهی فقط فیلد "Start command" موجود است. در این حالت کافی است Start command را روی node server.js بگذارید. این به‌تنهایی مشکل را حل می‌کند چون npm دیگر لازم نیست.

چرا این مشکل اصلاً پیش آمد؟
من در package.json نوشتم "start": "node server.js" به امید اینکه Railpack همین را اجرا کند. اما Railpack به‌جای خواندن مستقیم script، دستور npm start را اجرا می‌کند و این به یک npm binary در runtime image نیاز دارد که در Railpack's Node image سبک موجود نیست. راه‌حل استاندارد: همیشه start command را در پیکربندی پلتفرم به‌صورت مستقیم node server.js بگذارید، نه npm start.

بعد از اعمال این دو تغییر (Build type روی Docker و Start command روی node server.js)، redeploy بزنید. اگر باز هم خطایی دیدید، لاگ جدید را بفرستید.

helth 
بخش Health check که باز کرده‌اید فقط دو فیلد نشان می‌دهد:

فیلد
مقدار
وضعیت
Probe Type	TCP	✅ درست — فقط چک می‌کند پورت باز باشد
Interval	10 seconds	✅ درست

پس مشکل از Health check نیست. TCP probe درست است و باید کار کند.

مشکل واقعی کجاست؟
در بخش Build (که هنوز باز نکرده‌اید). این بخش را باز کنید تا این فیلدها را ببینید و تغییر دهید:

در بخش Build این تغییرات را اعمال کنید
فیلد
مقدار فعلی (احتمالی)
مقدار جدید
Build type (یا Build method)	Auto-detect (Railpack)	Docker
Start command (یا Run command)	npm start (پیش‌فرض Railpack)	node server.js
Dockerfile path	(خالی)	Dockerfile

این سه تغییر کل مشکل npm: not found را حل می‌کند:

Docker به‌جای Railpack: از node:20-slim شما استفاده می‌کند که npm دارد (ولی دیگر لازمش ندارید)
node server.js به‌جای npm start: مستقیماً Node را اجرا می‌کند، بدون نیاز به npm binary در runtime image
اگر در بخش Build فیلد "Start command" نبود
گاهی فقط فیلد "Build type" موجود است. در این صورت:

Build type را روی Docker بگذارید → Dockerfile شما استفاده می‌شود که در آن CMD ["node", "server.js"] تنظیم شده (یعنی start command از Dockerfile می‌آید، نه از npm start).
اگر فیلد "Build type" هم نبود
گاهی پلتفرم اجازه‌ی تغییر Build type را نمی‌دهد. در این حالت، package.json را این‌طور اصلاح کنید تا Railpack مجبور شود مستقیماً Node را اجرا کند:

json
{
  "name": "edgepanel",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "server.js",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node server.js",
    "build": "echo no-build-step"
  }
}
افزودن "main": "server.js" به Railpack می‌گوید مستقیماً node server.js را اجرا کند (نه npm start).

مراحل نهایی
۱. بخش Build را در Configuration snapshot باز کنید.
۲. اگر فیلد Start command دارید → روی node server.js بگذارید.
۳. اگر فیلد Build type دارید → روی Docker بگذارید.
۴. ذخیره کنید و redeploy بزنید.

اگر باز هم خطا داد، اسکرین‌شات از بخش Build باز‌شده بفرستید تا دقیق ببینم چه گزینه‌هایی موجود است.

ba ta vajoh be ax deploy betor kamel anjam shodeh ast? hala link panel ro az koja payda konam? 
تصویر را بررسی کردم — بله، deploy کاملاً موفق بوده:

✅ Built (سبز)
✅ Deployed (سبز)
تبریک! حالا برای پیدا کردن لینک دسترسی به panel:

وضعیت deploy
بله، deploy کاملاً موفق بوده:

✅ Built
✅ Deployed
لینک panel کجاست؟
روی صفحه‌ی فعلی (تب Deployments) لینک نمایش داده نمی‌شود. سه جا می‌توانید آن را پیدا کنید:

راه ۱ — در همان لاگ Deployed (ساده‌ترین)
در همان صفحه‌ی Deployments، روی ردیف سبز "Deployed" کلیک کنید تا باز شود. در انتهای لاگ آن، معمولاً یک خط شبیه این هست:

text
Deployed  https://<app-name>.hostless.app
آن URL لینک panel شماست.

راه ۲ — از تب Overview
در نوار بالایی صفحه (کنار Deployments)، روی تب Overview کلیک کنید. در بالای آن صفحه معمولاً URL عمومی app نمایش داده می‌شود به‌همراه دکمه‌ای مثل "Open" یا "Visit".

راه ۳ — از بخش Configuration snapshot → General
در همان صفحه پایین، بخش Configuration snapshot را ببینید. روی General کلیک کنید تا باز شود. در آنجا فیلدی مثل "App URL" یا "Default domain" هست که URL را نشان می‌دهد.

فرمت URL
روی Hostless هر app به‌طور خودکار یک ساب‌دامین رایگان با HTTPS می‌گیرد:

text
https://<app-name>.hostless.app
که <app-name> همان نامی است که موقع ساخت app انتخاب کردید (احتمالاً چیزی شبیه myyedgeee3 یا edgepanel).

اگر در هیچ‌کدام URL پیدا نشد
گاهی app بدون URL عمومی deploy می‌شود و باید یک Site به آن وصل کنید. در این حالت:

در سایدبار چپ روی Sites کلیک کنید
یک Site جدید بسازید و آن را به app خود لینک کنید
Site به‌طور خودکار یک URL می‌گیرد و ترافیک را به app شما می‌فرستد
تست سریع
وقتی URL را پیدا کردید، این تست‌ها را بکنید تا مطمئن شوید همه‌چیز کار می‌کند:

URL
انتظار
https://<app-name>.hostless.app/__health	باید یک JSON با "status":"ok" برگرداند
https://<app-name>.hostless.app/	صفحه‌ی اصلی app شما (هر چیزی که _worker.js روی / برمی‌گرداند)

اگر /__health جواب داد ولی / خطا داد، یعنی worker درست load شده اما در handler اصلی خطایی هست — در این صورت لاگ runtime را از تب Logs بگیرید و بفرستید.

اگر URL را پیدا کردید و کار می‌کند، به من بگویید تا اگر نیاز به بهبود panel یا اضافه‌کردن قابلیت جدید دارید، کمک کنم.

safheh panel chera baz nemishavad va khata nmidahad?? 

Thought Process
تصویر را بررسی کردم. حالا دو مشکل داریم:

وضعیت فعلی
از تصویر اول:

✅ App status: Running
✅ Memory: 7% استفاده
✅ URL عمومی: https://mttest.hostless.app
❗ منبع کد: tinairbehhh/edgetunnel@main — این پروژه‌ی EdgeTunnel است (یک Cloudflare Worker برای VLESS proxy tunnel)، نه یک panel ساده.
از تصویر دوم:

وقتی https://mttest.hostless.app را باز می‌کنید، خطای زیر برمی‌گردد:
json
{"error":"internal_server_error","message":"Unrecognized algorithm name"}
این پاسخ از catch بلوک server.js من می‌آید — یعنی worker اجرا شد اما در هندلر اصلی خطا داد.

علت خطا
Unrecognized algorithm name یک خطای WebCrypto در Node.js است. کد worker شما در حال فراخوانی crypto.subtle.encrypt() یا importKey() یا digest() با نام الگوریتمی است که Node.js نمی‌شناسد، ولی runtime بومی Cloudflare آن را می‌شناسد.

EdgeTunnel از پروتکل VLESS استفاده می‌کند که شامل:

رمزنگاری AES-128-GCM / ChaCha20-Poly1305
تولید و اعتبارسنجی UUID
ارتباطات WebSocket واقعی (با WebSocketPair)
این‌ها در محیط Cloudflare Workers به‌صورت بومی پشتیبانی می‌شوند، ولی در Node.js محدودیت‌هایی دارند.

مشکل بزرگ‌تر
EdgeTunnel یک Cloudflare Worker مخصوص است که برای استفاده از شبکه‌ی edge جهانی Cloudflare طراحی شده. اجرای آن روی Hostless (یک Node.js process تکی) کل هدف پروژه را از بین می‌برد:

تمام ترافیک VLESS از یک سرور تکی عبور می‌کند (به‌جای ۳۰۰+ POP جهانی Cloudflare)
WebSocket upgrades ممکن است به‌درستی کار نکنند
Bindings مخصوص Cloudflare (KV/Durable Objects) موجود نیستند
برای چنین پروژه‌ای، توصیه‌ی واقعی: همان Cloudflare Workers (رایگان) را deploy کنید.

اما اگر می‌خواهید روی Hostless ادامه دهید
برای پیدا کردن خطای دقیق، server.js را به‌روزرسانی کردم تا stack trace کامل و URL درخواست‌های ناموفق را لاگ کند:

حالا برای ادامه‌ی debug:

مرحله بعدی — stack trace دقیق بگیرید
فایل server.js به‌روزرسانی شده را commit و push کنید:

bash
git add server.js
git commit -m "debug: log full error stack trace for worker errors"
git push
سپس در Hostless یک redeploy بزنید. بعد از deploy:

۱. دوباره به https://mttest.hostless.app بروید. این بار خطای JSON شامل فیلد stack است که دقیقاً نشان می‌دهد در کدام خط از _worker.js خطا رخ داده.

۲. یا به تب Logs در داشبورد Hostless بروید — آنجا لاگ کامل با stack trace قابل خواندن است.

متن کامل خطا (یا stack trace) را به من بفرستید تا دقیق بگویم کدام الگوریتم WebCrypto مشکل دارد و چگونه polyfill شود.

هشدار مهم درباره‌ی ماهیت پروژه
بگذارید صادقانه بگویم — چیزی که شما deploy کرده‌اید، EdgeTunnel است (پروژه‌ی معروف Cloudflare Worker برای VLESS proxy tunnel که برای دور زدن محدودیت‌های شبکه‌ای استفاده می‌شود). این پروژه:

ویژگی
در Cloudflare Workers
در Hostless (Node.js)
شبکه‌ی edge جهانی	✅ ۳۰۰+ POP	❌ یک سرور تکی
WebSocket upgrade واقعی	✅ بومی	⚠️ stub شده
الگوریتم‌های WebCrypto بومی	✅ پشتیبانی کامل	❌ محدود
WebSocketPair	✅ واقعی	❌ stub
Bindings (KV/Durable Objects)	✅	❌ موجود نیست

حتی اگر این خطای crypto را حل کنیم، خطاهای بعدی (WebSocket، VLESS handshake، و غیره) ادامه خواهند یافت چون ساختار EdgeTunnel از پایه برای runtime Cloudflare طراحی شده.

توصیه‌ی نهایی
اگر هدف شما واقعاً اجرای یک VLESS tunnel است، بهترین راه همان deploy روی Cloudflare Workers (رایگان) است:

bash
# نصب wrangler
npm install -g wrangler

# ورود به Cloudflare
wrangler login

# در پوشه‌ی پروژه:
wrangler deploy
Worker در عرض چند ثانیه روی شبکه‌ی جهانی Cloudflare بالا می‌آید و URL آن https://edgetunnel.<your-subdomain>.workers.dev خواهد بود.

اگر می‌خواهید روی Hostless ادامه دهید، stack trace جدید را (بعد از redeploy با server.js به‌روزرسانی‌شده) بفرستید تا polyfill مناسب برای الگوریتم WebCrypto مشکل‌دار را اضافه کنم.

Generated files
1
File
server
· js
اگر می‌خواهید روی Hostless ادامه دهید، stack trace جدید را (بعد از redeploy با server.js به‌روزرسانی‌شده) بفرستید تا polyfill مناسب برای الگوریتم WebCrypto مشکل‌دار را اضافه کنم.

server jadid ra uploud kardam lotfan rdameh dahid 

Thought Process
اگر منظورتان این است که server.js جدید را در ریپازیتوری git commit و push کرده‌اید، حالا باید آن را در Hostless redeploy کنید. مراحلش اینجاست:

مراحل redeploy در Hostless
راه ۱ — Redeploy از داشبورد (ساده‌ترین)
۱. به داشبورد Hostless بروید: https://hostless.cloud/apps/mttest/deployments
۲. به تب Deployments بروید
۳. در گوشه‌ی بالا-راست صفحه، روی دکمه‌ی "Deploy" یا "Redeploy" کلیک کنید
۴. در پنجره‌ی بازشده:

Branch: main
Commit: آخرین commit (یا "Latest")
روی Confirm کلیک کنید
۵. صبر کنید تا مراحل Changes pulled → Built → Deployed سبز شوند
راه ۲ — Trigger با git push (اگر auto-deploy خاموش است)
bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
این یک commit خالی می‌سازد تا Hostless آن را به‌عنوان trigger ببیند و deploy جدید را شروع کند.

بعد از Deployed سبز شدن
تست مستقیم URL
در ترمینال خودتان این دستور را اجرا کنید:

bash
curl -s https://mttest.hostless.app/ | head -c 2000
این بار JSON خطا شامل فیلدهای زیر خواهد بود:

json
{
  "error": "internal_server_error",
  "message": "Unrecognized algorithm name",
  "name": "...",
  "code": "...",
  "stack": "at file:///app/_worker.js:XXX:YYY\n    at ...",
  "request": { "method": "GET", "url": "/" }
}
لاگ runtime را هم بگیرید
به تب Logs در داشبورد Hostless بروید. در آنجا خطایی شبیه این خواهید دید:

text
[server] request error:
  url: GET /
  message: Unrecognized algorithm name
  name: TypeError
  code: ERR_CRYPTO_INVALID_ALGORITHM
  stack: TypeError: Unrecognized algorithm name
    at SubtleCrypto.digest (node:internal/crypto/webcrypto:XXX:YY)
    at file:///app/_worker.js:NNN:NN
    ...
چه چیزی را برای من بفرستید
این سه مورد را کپی و در همین چت پیست کنید:

۱. خروجی curl -s https://mttest.hostless.app/
۲. یا متن لاگ از تب Logs (با stack trace کامل)
۳. یا اسکرین‌شات از تب Logs که خطا را نشان می‌دهد

با دیدن خط دقیق در _worker.js که خطا می‌دهد، می‌توانم polyfill مناسب را بسازم — مثلاً:

اگر خطا در crypto.subtle.digest('SHA-256', ...) باشد → casing fix
اگر در importKey با نام نامعتبر باشد → normalize algorithm name
اگر در encrypt({ name: 'AES-128-GCM', ...}) باشد → تبدیل به { name: 'AES-GCM', length: 128 }
منتظر خروجی شما هستم.

safheh panel chera baz nemishavad va khata nmidahad?? 
2/2

Thought Process
این تصویر همان وضعیت قبلی است — هیچ پیشرفتی نکرده‌اید. نشانه‌ی قطعی:

JSON که در مرورگر می‌بینید:

json
{"error":"internal_server_error","message":"Unrecognized algorithm name"}
این فرمت قدیمی است (تک‌خطی، فقط دو فیلد). اگر server.js جدیدی که به‌روزرسانی کرده‌بودم deploy شده بود، پاسخ باید این‌طور می‌شد (چندخطی، با فیلدهای stack و name و code):

json
{
  "error": "internal_server_error",
  "message": "Unrecognized algorithm name",
  "name": "TypeError",
  "code": "...",
  "stack": "at file:///app/_worker.js:...",
  "request": { "method": "GET", "url": "/" }
}
پس نتیجه: کد جدید شما هنوز روی Hostless deploy نشده است.

چرا نشده؟ — بررسی کنید
در ترمینال خود، در پوشه‌ی ریپازیتوری edgetunnel این دستورات را اجرا کنید و خروجی را برای من بفرستید:

bash
# ۱. آیا تغییرات commit شده‌اند؟
git status

# ۲. آخرین commits را ببینید — آیا commit شما در لیست هست؟
git log --oneline -5

# ۳. آخرین commit چه فایل‌هایی را تغییر داده؟
git show HEAD --stat

# ۴. در HEAD فعلی، server.js شما چه فرمتی دارد؟ این خط باید فیلدهای stack/name/code را داشته باشد
grep -c "stack:" server.js
# باید عددی غیر صفر برگرداند (مثلاً 2 یا 3)
حالت‌های محتمل
حالت
علل
راه‌حل
git status نشان می‌دهد server.js هنوز modified است	git add server.js را اجرا نکرده‌اید	git add server.js && git commit -m "debug: log full error stack trace" && git push
git log نشان می‌دهد commit شما نیست	push انجام نشده یا به شاخه‌ی اشتباه	git push origin main
Commit هست ولی Hostless آن را نگرفته	auto-deploy خاموش است یا webhook خراب شده	در داشبورد به صورت دستی redeploy بزنید
Commit در Hostless هست (داشبورد commit hash شما را نشان می‌دهد) ولی باز هم فرمت قدیمی برمی‌گردد	Railpack از cached image استفاده می‌کند	در داشبورد Hostless گزینه‌ی "Clear build cache" یا "Rebuild without cache" را بزنید

نکته‌ی مهم درباره‌ی commit hash
در داشبورد Hostless (تصویر اول شما) نوشته شده:

Deployed: d1c7f18 by tinairbehhh
این hash (d1c7f18) باید با hash آخرین commit شما در ریپازیتوری دقیقاً یکی باشد. اگر نیست، یعنی Hostless کد قدیمی‌تر را deploy کرده. اجرا کنید:

bash
git rev-parse HEAD
و خروجی را با d1c7f18 مقایسه کنید.

بعد از اینکه مطمئن شدید کد جدید deploy شده
این دستور را اجرا کنید و خروجی را بفرستید:

bash
curl -s -i https://mttest.hostless.app/ | head -50
این دستور:

-s: silent
-i: headerها و body را با هم نشان می‌دهد
head -50: فقط ۵۰ خط اول
خروجی باید شامل stack trace باشد. آن را برای من بفرستید تا polyfill مناسب را بسازم.

بدون stack trace دقیق، نمی‌توانم حدس بزنم کدام الگوریتم WebCrypto در _worker.js شما نامعتبر است. باید ببینیم خطا در کدام خط از _worker.js رخ می‌دهد.

mage deploy movafagh nboodeh 

Thought Process
بله، deploy موفق بود — اما با کد قدیمی. بگذارید واضح توضیح دهم:

تفاوت «deploy موفق» با «کد جدید deploy شده»
چیزی که در داشبورد می‌بینید
معنی واقعی
✅ Status: Running	کانتینر در حال اجراست
✅ Live	کانتینر در حال سرو کردن ترافیک است
✅ Deployed: d1c7f18	commit d1c7f18 با موفقیت deploy شد

این یعنی commit d1c7f18 با موفقیت deploy شده. ولی آیا این commit شامل server.js جدید شما هست؟ احتمالاً نه — وگرنه فرمت خطا در مرورگر باید چندخطی با فیلدهای stack و name و code می‌شد، نه تک‌خطی با فقط دو فیلد.

نشانه‌ی قطعی: فرمت JSON
من server.js را به این تغییر دادم:

قدیمی: JSON.stringify({error, message}) → تک‌خطی
جدید: JSON.stringify({error, message, name, code, stack, request}, null, 2) → چندخطی، با فاصله‌گذاری
مرورگر شما این را نشان می‌دهد:

json
{"error":"internal_server_error","message":"Unrecognized algorithm name"}
تک‌خطی، فقط دو فیلد → یعنی کد قدیمی در حال اجراست.

برای تأیید، این را اجرا کنید
در ترمینال خودتان، در پوشه‌ی ریپازیتوری edgetunnel:

bash
# آخرین commit hash شما چیست؟
git rev-parse HEAD
این خروجی را با d1c7f18 (که در داشبورد Hostless نوشته شده) مقایسه کنید:

نتیجه
معنی
راه‌حل
با هم یکی هستند	commit شما در Hostless هست ولی server.js جدید در آن نیست	در ریپازیتوری فایل server.js را با نسخه‌ی جدید که برایتان ساختم جایگزین کنید، بعد commit و push
یکی نیستند	کد جدیدی که فکر می‌کردید push کرده‌اید، در Hostless نیست	git push origin main اجرا کنید

چطور مطمئن شوم که فایل درست push شده؟
بعد از push، در GitHub/GitLab به ریپازیتوری tinairbehh/edgetunnel بروید و فایل server.js را باز کنید. در آن فایل، این خطوط را پیدا کنید:

javascript
res.end(JSON.stringify({
  error: 'internal_server_error',
  message: String(err?.message || err),
  name: String(err?.name || 'Error'),
  code: err?.code || null,
  stack: String(err?.stack || ''),
  request: { method: req.method, url: req.url }
}, null, 2));
اگر این خطوط را در فایل GitHub ندیدید، یعنی push نشده است.

چطور فایل جدید را در ریپازیتوری قرار دهم؟
ساده‌ترین راه:

۱. فایل server.js را از این لینک دانلود کنید (یا کپی کنید).

۲. در کامپیوتر خودتان، در پوشه‌ی ریپازیتوری، فایل قدیمی server.js را با این محتوای جدید جایگزین کنید.

۳. در همان پوشه:

bash
git add server.js
git commit -m "debug: include stack trace in error response"
git push origin main
۴. در Hostless صبر کنید تا auto-deploy فعال شود (یا به‌صورت دستی redeploy بزنید).

۵. بعد از Deployed شدن، دوباره https://mttest.hostless.app را باز کنید. این بار JSON باید چندخطی با stack trace باشد.

تست جایگزین با curl
برای اینکه مطمئن شوید کش مرورگر در کار نیست:

bash
curl -s https://mttest.hostless.app/
اگر این هم همان تک‌خطی را برگرداند، یعنی قطعاً کد جدید deploy نشده.

خلاصه: deploy موفق بود ولی با کد قدیمی. باید فایل server.js جدید را در ریپازیتوری جایگزین کنید و push کنید. بعد از deploy جدید، پاسخ باید شامل stack trace باشد که به ما می‌گوید دقیقاً کجا در _worker.js خطا رخ می‌دهد.

ba fayl jadid deploy kardam 

Thought Process
عالی! حالا stack trace را داریم و علت کاملاً مشخص است:

علت دقیق خطا
از تصویر:

name: "NotSupportedError"
code: 9
Stack trace: normalizeAlgorithm ← SubtleCrypto.digest ← _worker.js ← تابع MD5MD5
worker شما در تابعی به نام MD5MD5 در حال فراخوانی crypto.subtle.digest('MD5', ...) است. مشکل اینجاست:

Runtime
پشتیبانی از MD5 در WebCrypto
Cloudflare Workers	✅ بومی (برای سازگاری legacy)
Node.js	❌ پشتیبانی نمی‌کند (MD5 را ناامن می‌داند)

پس worker درست در محیط بومی Cloudflare کار می‌کند، ولی در Node.js هنگام هش MD5 خطا می‌دهد.

راه‌حل — Polyfill برای MD5 در crypto.subtle
یک polyfill اضافه می‌کنم که قبل از import _worker.js اجرا می‌شود و الگوریتم MD5 را با node:crypto پیاده‌سازی می‌کند. تمام الگوریتم‌های دیگر SHA/AES/HMAC بدون تغییر به Node.js پاس داده می‌شوند.

حالا یک تست سریع هم اجرا می‌کنم تا مطمئن شوم polyfill درست کار می‌کند:

همه‌ی تست‌ها PASS شدند:

✅ MD5("hello") = 5d41402a... (درست)
✅ MD5("") = d41d8cd9... (درست)
✅ SHA-256 همچنان به‌درستی به Node.js native delegate می‌شود
✅ Double-MD5 (الگوی تابع MD5MD5 شما) بدون خطا کار می‌کند
چه چیزی اضافه شد
در server.js به‌روزرسانی‌شده، قبل از import _worker.js، یک تابع patchedDigest روی crypto.subtle.digest نصب می‌شود که:

الگوریتم درخواستی
رفتار
MD5 یا md5	با node:crypto.createHash('md5') هش می‌سازد و ArrayBuffer برمی‌گرداند (مثل Cloudflare)
SHA1, SHA256, SHA384, SHA512	به SHA-1, SHA-256, SHA-384, SHA-512 نرمالایز می‌شود (برای مروفولوژی Cloudflare که گاهی بدون خط تیره می‌نویسد)
بقیه	دست‌نخورده به پیاده‌سازی بومی Node.js ارجاع داده می‌شود

Polyfill روی prototype SubtleCrypto نصب می‌شود تا هر مسیر دسترسی (crypto.subtle.digest یا globalThis.crypto.subtle.digest یا هر instance دیگر) به آن برسد.

مراحل deploy
۱. فایل server.js جدید را دانلود کنید و در ریپازیتوری tinairbehh/edgetunnel جایگزین فایل قبلی کنید.

۲. Commit و push:

bash
git add server.js
git commit -m "fix: polyfill MD5 in crypto.subtle.digest for Node.js WebCrypto"
git push origin main
۳. در Hostless صبر کنید تا auto-deploy فعال شود (یا دستی redeploy بزنید).

۴. بعد از Deployed سبز شدن، دوباره به https://mttest.hostless.app بروید. این بار:

اگر صفحه‌ی اصلی panel باز شد 🎉
اگر باز هم خطایی داد، آن را برای من بفرستید — احتمالاً خطای بعدی درباره‌ی WebSocket یا چیز دیگری است که با polyfill بعدی حل می‌شود.
هشدار درباره‌ی خطاهای بعدی محتمل
از آنجا که EdgeTunnel از پروتکل VLESS با WebSocket استفاده می‌کند، بعد از حل مشکل MD5 ممکن است با این‌ها روبرو شوید:

خطای محتمل
علت
polyfill بعدی
WebSocket is not defined یا WebSocketPair upgrade failed	WebSocket بومی Node فرق با Cloudflare دارد	نصب پکیج ws و adapter
Cannot read property 'ASSETS' of undefined	binding استاتیک Cloudflare موجود نیست	stub که در server.js هست باید پوشش دهد
ReadableStream is not a constructor	در نسخه‌های قدیمی Node	ارتقا به Node 20+ (داشبورد Hostless را چک کنید)

اگر خطای بعدی را بفرستید، فوراً polyfill متناسب را اضافه می‌کنم.

Generated files
1
File
server
· js
deploy ba file jadid 

Thought Process
تصویر همان خطای قبلی است — name: "NotSupportedError", code: 9, از MD5MD5. ولی این بار فرمت JSON شامل stack و name و code است، یعنی server.js با error logging به‌روزرسانی‌شده deploy شده. اما polyfill MD5 یا نصب نشده، یا نصب شده ولی اثر نکرده.

بگذارید محلی تست کنم که آیا polyfill واقعاً در Node 20 کار می‌کند یا نه:

polyfill در Node محلی کاملاً کار می‌کند — همه‌ی ۴ تست PASS شدند. حتی حالت سخت‌گیرانه‌ای که در آن کد worker در زمان module load یک reference به digest می‌گیرد و بعد از آن استفاده می‌کند، هم درست patch می‌شود.

پس مشکل قطعاً این است که نسخه‌ی MD5 polyfill‌دار server.js در Hostless deploy نشده است. احتمالاً فقط نسخه‌ی قبلی (با error logging) push شده، نه نسخه‌ای که polyfill را دارد.

برای تأیید، این سه چیز را چک کنید
۱. در ریپازیتوری GitHub/GitLab، فایل server.js را باز کنید
در ابتدای فایل باید این خطوط را ببینید (حدود خط ۱۰-۱۱):

javascript
import nodeCrypto from 'node:crypto';

// ---------- WebCrypto MD5 polyfill ----------
و حدود خط ۹۶:

javascript
console.log('[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)');
اگر این خطوط را ندیدید، یعنی فایل اشتباه push شده است.

۲. در Hostless → تب Logs
وقتی کانتینر start می‌شود، باید این خط لاگ را در ابتدا ببینید:

text
[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)
[server] worker loaded successfully.
[server] Edgepanel listening on http://0.0.0.0:...
اگر خط "WebCrypto MD5 polyfill installed" را ندیدید، یعنی قطعاً کد polyfill در deployment نیست.

۳. چک کنید کدام نسخه‌ی server.js را push کرده‌اید
در پوشه‌ی ریپازیتوری خودتان:

bash
# فایل را در ترمینال ببینید
head -20 server.js

# یا فقط چک کنید آیا کلمه MD5 polyfill در فایل هست
grep -n "MD5 polyfill" server.js
اگر grep چیزی پیدا نکرد، فایل اشتباه است.

اگر فایل درست نیست، این کارها را بکنید
۱. فایل server.js را از این لینک دانلود کنید (دکمه‌ی راست → Save Link As).

۲. در پوشه‌ی ریپازیتوری edgetunnel، فایل قدیمی server.js را با این فایل جدید جایگزین کنید (overwrite کنید).

۳. مطمئن شوید جایگزینی انجام شده:

bash
grep -c "MD5 polyfill" server.js
# باید عددی >= 1 برگرداند
۴. Commit و push:

bash
git add server.js
git commit -m "fix: add MD5 polyfill for crypto.subtle.digest"
git push origin main
۵. در Hostless صبر کنید تا auto-deploy فعال شود (یا دستی redeploy بزنید).

۶. به تب Logs بروید و دنبال این خط بگردید:

text
[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)
اگر این خط را دیدید، یعنی polyfill درست deploy شده. بعد از آن، به https://mttest.hostless.app بروید و ببینید چه اتفاقی می‌افتد.

اگر خط polyfill را دیدید ولی باز هم خطا داد
در این حالت (که بعید است)، نسخه‌ی Node شما در Hostless ممکن است قدیمی‌تر از ۲۰ باشد. در این صورت به Configuration → Build بروید و مطمئن شوید engines.node در package.json روی >=20 تنظیم شده (که هست).

خلاصه: polyfill از نظر فنی درست است (در Node 24 تست شد). مشکل فقط این است که نسخه‌ی درست server.js در Hostless deploy نشده. فایل را از لینک دانلود کنید، جایگزین کنید، push کنید و دوباره redeploy بزنید.

ba file jadid hama ro pak kardam dobareh deploy  kardam 

Thought Process
پیشرفت عالی! خطای MD5 کاملاً حل شد. حالا یک خطای جدید داریم که از دسته‌ی "Cloudflare-specific features":

خطای جدید
text
TypeError: Cannot read properties of undefined (reading 'colo')
at file:///app/_worker.js:44:31
worker شما در خط ۴۴ _worker.js در حال خواندن request.cf.colo است. request.cf یک شیء است که فقط در محیط Cloudflare Workers وجود دارد و شامل metadata مانند:

colo — کد دیتاسنتر Cloudflare (مثل "SJC", "FRA")
country, city, region — اطلاعات جغرافیایی
asn, asOrganization — اطلاعات ISP
tlsVersion, tlsCipher — اطلاعات TLS
httpProtocol — نسخه‌ی HTTP
در Node.js این شیء وجود ندارد (undefined)، پس request.cf.colo خطا می‌دهد.

راه‌حل — Polyfill برای request.cf
یک شیء cf با مقادیر پیش‌فرض منطقی به هر request اضافه می‌کنم قبل از ارسال به worker:

حالا تست می‌کنم که آیا request.cf واقعاً به Request اضافه می‌شود:

تست کاملاً موفق بود:

✅ request.cf.colo = 'SJC' (بدون خطا)
✅ request.cf.country, request.cf.ip, request.cf.tlsVersion هم درست دسترسی‌پذیرند
✅ سایر خصوصیات Request (method, url, headers) دست‌نخورده باقی می‌مانند
چه چیزی اضافه شد
در server.js به‌روزرسانی‌شده، قبل از ارسال request به worker، یک شیء cf با حدود ۳۰ فیلد Cloudflare به Request اضافه می‌شود:

دسته
فیلدها
Datacenter	colo, metroRegion, timezone, edgeRequestModifyTime
Geo	country, city, region, postalCode, continent, latitude, longitude
شبکه/ASN	asn, asOrganization, clientTcpRtt, ip (از x-forwarded-for یا x-real-ip)
TLS	tlsVersion, tlsCipher, tlsClientAuth*
HTTP	httpProtocol, requestPriority
Bot detection	botManagement, ja3Hash, clientTrustScore

مقادیر از headerهای استاندارد Cloudflare (مثل cf-ipcountry) یا از env variableها خوانده می‌شوند، و اگر نباشند از مقادیر پیش‌فرض امن استفاده می‌کند.

مرحله deploy
۱. فایل server.js را دانلود و در ریپازیتوری جایگزین کنید.

۲. مطمئن شوید فایل درست جایگزین شده:

bash
grep -c "Polyfill Cloudflare-specific request.cf" server.js
# باید 1 برگرداند
۳. Commit و push:

bash
git add server.js
git commit -m "fix: polyfill request.cf object for Cloudflare Worker compatibility"
git push origin main
۴. در Hostless صبر کنید تا redeploy انجام شود.

۵. دوباره به https://mttest.hostless.app بروید و ببینید چه می‌شود.

انتظار بعد از deploy
با حل request.cf.colo، احتمالاً یکی از این سه حالت رخ می‌دهد:

حالت
علائم
معنی
🎉 صفحه‌ی panel باز می‌شود	HTML یا JSON واقعی برمی‌گردد	موفقیت نهایی!
⚠️ خطای جدید	مثلاً WebSocket is not defined یا Cannot read property 'ASSETS'	نیاز به polyfill بعدی — برای من بفرستید
⚠️ خطای منطقی worker	مثلاً "invalid UUID" یا "unauthorized"	worker کار می‌کند ولی پیکربندی خاص خودش را می‌خواهد (UUID/password در env vars)

اگر خطای جدید دیدید، همین‌جا بفرستید تا polyfill متناسب را اضافه کنم.

Generated files
1
File
server
· js
log jadid 
No response, Please try again later.
Hostless





Resources










Account


Community



​
Search logs…
/
Search
all
Process
all
Level
Historical range · scroll to top for older logs. Red bars indicate errors.
Log volume over time · 79 logs
logs
errors
Time
Process
Level
Message
Trace
web
—
-----App build started------
web
—
[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)
web
—
[server] worker loaded successfully.
web
—
[server] Edgepanel listening on http://0.0.0.0:8000
web
—
[server] Health endpoints:
web
—
[server]   GET /__health -> 200 (always, liveness probe)
web
—
[server]   GET /__ready  -> 200 if worker loaded, 503 otherwise
web
—
[server] Worker loaded: true
web
—
[server] Cloudflare bindings on Hostless are stubbed (KV/D1/R2/ASSETS unavailable).
web
ERR
[server] request error:
web
—
  url: GET /
web
—
  message: Cannot read properties of undefined (reading 'colo')
web
ERR
  name: TypeError
web
—
  code: undefined
web
ERR
  stack: TypeError: Cannot read properties of undefined (reading 'colo')
web
—
    at fetch (file:///app/_worker.js:44:31)
web
—
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
web
—
    at async Server.<anonymous> (file:///app/server.js:266:22)
web
—
GET / -> 500 578ms
web
ERR
[server] request error:
web
—
  url: GET /
web
—
  message: Cannot read properties of undefined (reading 'colo')
web
ERR
  name: TypeError
web
—
  code: undefined
web
ERR
  stack: TypeError: Cannot read properties of undefined (reading 'colo')
web
—
    at fetch (file:///app/_worker.js:44:31)
web
—
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
web
—
    at async Server.<anonymous> (file:///app/server.js:266:22)
web
—
GET / -> 500 51ms
web
ERR
[server] request error:
web
—
  url: GET /
6 Show full message

Thought Process
بسیار مهم! اطلاعات کلیدی از لاگ‌ها:

text
✅ [server] WebCrypto MD5 polyfill installed   ← این نسخه MD5 polyfill دارد
✅ [server] worker loaded successfully.
✅ [server] Edgepanel listening on http://0.0.0.0:8000
❌ message: Cannot read properties of undefined (reading 'colo')
   at async Server.<anonymous> (file:///app/server.js:266:22)
مشکل: stack trace می‌گوید خطا از server.js:266 آمده — یعنی نسخه‌ای که در حال اجراست MD5 polyfill را دارد ولی request.cf polyfill را ندارد.

بگذارید بررسی کنم چه خطی در نسخه‌های مختلف server.js قرار دارد:

تأیید شد! در نسخه‌ی deploy‌شده روی Hostless:

خط 266 = جایی که fetchHandler(request, env, ctx) صدا زده می‌شود (طبق stack trace)
در نسخه‌ی فعلی server.js که برایتان ساخته‌ام:

خط 266 = کامنت // ---------- Polyfill Cloudflare-specific request.cf ----------
خط 348 = جایی که fetchHandler(request, env, ctx) صدا زده می‌شود
یعنی نسخه‌ای که در Hostless در حال اجراست، ۸۲ خط کوتاه‌تر از نسخه‌ی فعلی است — دقیقاً به اندازه‌ی کد polyfill برای request.cf. پس نسخه‌ای که شما push کرده‌اید، MD5 polyfill را دارد ولی request.cf polyfill را ندارد.

چرا این اتفاق افتاد؟
احتمالاً وقتی فایل جدید را دانلود و جایگزین کردید، یکی از این موارد رخ داده:

مرورگر کش کرده و فایل قدیمی‌تری را ذخیره داشته
فایل را قبل از آخرین به‌روزرسانی من دانلود کرده‌اید (وقتی فقط MD5 polyfill اضافه شده بود)
فایل را در ریپازیتوری کپی نکرده‌اید، فقط در فایلسیستم محلی جایگزین کرده‌اید و git add فراموش شده
راه‌حل قطعی — فایل را مستقیم از ریپازیتوری من بسازید
برای اینکه مطمئن باشیم فایل درست جایگزین می‌شود، این دستورات را در ترمینال خودتان اجرا کنید (دقیقاً به‌همین ترتیب):

bash
# ۱. به پوشه‌ی ریپازیتوری edgetunnel بروید
cd path/to/your/edgetunnel

# ۲. فایل server.js قدیمی را حذف کنید
rm server.js

# ۳. فایل جدید را با curl دانلود کنید (مستقیم، بدون کش مرورگر)
# اگر curl ندارید، فایل را از لینک زیر با مرورگر دانلود کنید و در این پوشه کپی کنید:
# https://dl.cloud.z.ai/edgepanel-fix/server.js
curl -L -o server.js "https://dl.cloud.z.ai/edgepanel-fix/server.js"

# ۴. تأیید کنید فایل درست دانلود شده — باید این خط باشد:
grep -n "Polyfill Cloudflare-specific request.cf" server.js
# باید خروجی بدهد:  266:    // ---------- Polyfill Cloudflare-specific request.cf ----------

# ۵. تعداد کل خطوط فایل را چک کنید:
wc -l server.js
# باید حدود 432 خط باشد

# ۶. تأیید کنید که fetchHandler روی خط 348 است (نه 266):
grep -n "fetchHandler(request, env, ctx)" server.js
# باید خروجی بدهد:  348:    const response = await fetchHandler(request, env, ctx);
اگر لینک دانلود بالا کار نکرد
می‌توانید فایل را از این مسیر در chat با من باز کنید و محتوایش را مستقیم کپی کنید:

۱. روی لینک server.js کلیک کنید
۲. در صفحه‌ای که باز می‌شود، همه‌ی محتوا را با Ctrl+A و Ctrl+C کپی کنید
۳. در کامپیوتر خودتان، فایل server.js را در پوشه‌ی ریپازیتوری با یک ادیتور متن (VSCode, nano, vim) باز کنید
۴. همه‌ی محتوای قدیمی را پاک کنید (Ctrl+A سپس Delete)
۵. محتوای جدید را Paste کنید (Ctrl+V)
۶. ذخیره کنید

بعد از جایگزینی فایل
bash
# تأیید نهایی:
grep -c "Polyfill Cloudflare-specific request.cf" server.js
# باید 1 برگرداند

grep -c "MD5 polyfill" server.js
# باید 1 برگرداند

# commit و push:
git add server.js
git commit -m "fix: add request.cf polyfill (was missing in previous deploy)"
git push origin main
سپس در Hostless منتظر auto-deploy بمانید (یا دستی redeploy بزنید).

بعد از deploy جدید، چک کنید
به تب Logs بروید و دنبال این خط بگردید:

text
[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)
[server] worker loaded successfully.
[server] Edgepanel listening on http://0.0.0.0:8000
(هیچ لاگ خاصی برای cf polyfill اضافه نکردم چون هر request آن را به‌صورت جداگانه تنظیم می‌کند، نه یک‌بار در startup. ولی نباید دیگر خطای Cannot read properties of undefined (reading 'colo') را ببینید.)

اگر خطا باز هم request.cf.colo بود، یعنی هنوز نسخه‌ی قدیمی در حال اجراست و باید به شما بگویم چطور cache را در Hostless پاک کنید.

اگر خطای جدیدی دیدید، آن را برای من بفرستید.

Send a Message


Connect IM

GLM-5.2
High
File
test_cf_polyfill.mjs
// Test that we can attach a .cf property to a Request object in Node.js

const request = new Request('https://example.com/', {
  method: 'GET',
  headers: new Headers({ 'host': 'example.com' })
});

const cfStub = {
  colo: 'SJC',
  country: 'XX',
  city: 'Unknown',
  ip: '127.0.0.1',
  tlsVersion: 'TLSv1.3',
  httpProtocol: 'HTTP/1.1',
  asn: 0
};

// Try defineProperty first
try {
  Object.defineProperty(request, 'cf', {
    value: cfStub,
    writable: true,
    configurable: true,
    enumerable: false
  });
  console.log('defineProperty succeeded.');
} catch (e) {
  console.log('defineProperty failed:', e.message);
  // Fallback
  request.cf = cfStub;
}

// Verify
console.log('request.cf =', request.cf);
console.log('request.cf.colo =', request.cf?.colo);
console.log('typeof request.cf =', typeof request.cf);

// Simulate worker access pattern that previously failed
try {
  const colo = request.cf.colo;
  const country = request.cf.country;
  const ip = request.cf.ip;
  console.log('\nWorker access simulation:');
  console.log('  colo:', colo);
  console.log('  country:', country);
  console.log('  ip:', ip);
  console.log('PASS — no TypeError thrown');
} catch (e) {
  console.log('\nWorker access FAILED:', e.name, e.message);
}

// Test method, url, headers still work after attaching .cf
console.log('\nOther Request properties still work:');
console.log('  request.method:', request.method);
console.log('  request.url:', request.url);
console.log('  request.headers.get("host"):', request.headers.get('host'));


// server.js (v2)
// Adapter that runs a Cloudflare Worker (_worker.js) as a standard Node.js
// HTTP server on Hostless. Adds dedicated /__health and /__ready endpoints
// that bypass the worker, so Hostless health checks always succeed even if
// the worker is slow or fails on the root path.

import http from 'node:http';
import { Readable } from 'node:stream';
import nodeCrypto from 'node:crypto';

// ---------- WebCrypto MD5 polyfill ----------
// Cloudflare Workers' WebCrypto supports MD5 (for legacy reasons).
// Node.js's WebCrypto does NOT — it throws NotSupportedError / code 9.
// We monkey-patch crypto.subtle.digest to route MD5 calls to node:crypto's
// createHash('md5'), while leaving all other algorithms (SHA-*, AES-*, HMAC,
// etc.) to Node's native implementation.
//
// This MUST run before we import _worker.js, so the worker sees a
// Cloudflare-compatible crypto.subtle at module-eval time.

function toBuffer(data) {
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    // TypedArray / DataView — preserve byteOffset and byteLength
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (Buffer.isBuffer(data)) return data;
  if (data === null || data === undefined) return Buffer.alloc(0);
  return Buffer.from(data);
}

function toAlgorithmName(algorithm) {
  if (typeof algorithm === 'string') return algorithm;
  if (algorithm && typeof algorithm === 'object' && typeof algorithm.name === 'string') {
    return algorithm.name;
  }
  throw new TypeError(`Unsupported algorithm format: ${String(algorithm)}`);
}

const originalSubtleDigest = nodeCrypto.subtle.digest.bind(nodeCrypto.subtle);

async function patchedDigest(algorithm, data) {
  const name = toAlgorithmName(algorithm);
  const upper = name.toUpperCase();

  // MD5 — not in Node's WebCrypto, but available on Cloudflare Workers.
  // Route to node:crypto's createHash('md5').
  if (upper === 'MD5') {
    const buf = toBuffer(data);
    const hash = nodeCrypto.createHash('md5').update(buf).digest();
    // WebCrypto digest returns a Promise<ArrayBuffer>, not a Buffer.
    // Copy into a fresh ArrayBuffer to detach from Buffer's pool.
    const out = new ArrayBuffer(hash.length);
    new Uint8Array(out).set(hash);
    return out;
  }

  // Also polyfill a few other Cloudflare-quirky variants just in case
  // the worker uses lowercase or aliased names Node doesn't accept.
  // Normalize casing for SHA family.
  const shaAlias = {
    'SHA1': 'SHA-1',
    'SHA256': 'SHA-256',
    'SHA384': 'SHA-384',
    'SHA512': 'SHA-512'
  };
  if (shaAlias[upper]) {
    return originalSubtleDigest(shaAlias[upper], data);
  }

  // Default: delegate to native implementation with the original argument.
  return originalSubtleDigest(algorithm, data);
}

// Patch on the SubtleCrypto prototype so any access path benefits.
const SubtleCryptoProto = Object.getPrototypeOf(nodeCrypto.subtle);
if (SubtleCryptoProto && SubtleCryptoProto.digest !== patchedDigest) {
  SubtleCryptoProto.digest = patchedDigest;
}
// Also patch the globalThis.crypto.subtle instance directly, in case the
// prototype patch doesn't take for some access patterns.
const globalSubtle = globalThis.crypto?.subtle;
if (globalSubtle && globalSubtle.digest !== patchedDigest) {
  try {
    Object.defineProperty(globalSubtle, 'digest', {
      value: patchedDigest,
      configurable: true,
      writable: true
    });
  } catch {
    // If defineProperty fails (non-configurable), fall back to direct assign.
    globalSubtle.digest = patchedDigest;
  }
}

console.log('[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)');

// ---------- Cloudflare global polyfills (best-effort) ----------

class CacheStub {
  async match() { return undefined; }
  async put() {}
  async delete() { return false; }
}
const caches = {
  default: new CacheStub(),
  async open() { return new CacheStub(); }
};

class WebSocketStub {
  constructor() { this.readyState = 0; }
  accept() {}
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
class WebSocketPairStub {
  constructor() {
    this[0] = new WebSocketStub();
    this[1] = new WebSocketStub();
  }
}

class HTMLRewriterStub {
  on() { return this; }
  transform(response) { return response; }
}

globalThis.caches = caches;
globalThis.WebSocketPair = WebSocketPairStub;
globalThis.HTMLRewriter = HTMLRewriterStub;

// ---------- Worker loader ----------

let fetchHandler = null;
let workerLoadError = null;

try {
  const workerModule = await import('./_worker.js');
  const defaultExport = workerModule?.default;
  fetchHandler =
    (typeof defaultExport?.fetch === 'function' && defaultExport.fetch) ||
    (typeof defaultExport === 'function' && defaultExport) ||
    (typeof workerModule.fetch === 'function' && workerModule.fetch) ||
    null;

  if (!fetchHandler) {
    workerLoadError = new Error(
      'No fetch handler found in _worker.js. Expected: export default { async fetch(req, env, ctx) {} }'
    );
  } else {
    console.log('[server] worker loaded successfully.');
  }
} catch (err) {
  workerLoadError = err;
  console.error('[server] FAILED to import ./_worker.js:');
  console.error(err);
  // Do NOT exit — keep the server up so /__health still responds and we can
  // read the error from the Hostless Logs tab. /__ready will return 503.
}

// ---------- env / ctx stubs ----------

const env = {
  ASSETS: {
    fetch: async () => new Response(
      'ASSETS binding not available on Hostless.',
      { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    )
  },
  ...Object.fromEntries(
    Object.entries(process.env).filter(([k]) =>
      /^(CF_|CLOUDFLARE_|PUBLIC_|SECRET_|API_|DB_|KV_|EDGEPANEL_)/.test(k)
    )
  )
};

const ctx = {
  waitUntil(p) {
    if (p && typeof p.catch === 'function') {
      p.catch(err => console.error('[waitUntil] rejected:', err));
    }
  },
  passThroughOnException() {},
  abortController: new AbortController()
};

// ---------- HTTP server ----------

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const startedAt = new Date().toISOString();

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('content-type', contentType);
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();

  // --- Bypass worker for health/readiness probes ---
  // Hostless (and most PaaS) will hit these to decide if container is healthy.
  if (req.url === '/__health' || req.url === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      uptime_s: process.uptime(),
      started_at: startedAt,
      worker_loaded: !!fetchHandler
    });
  }
  if (req.url === '/__ready' || req.url === '/ready') {
    if (!fetchHandler) {
      return sendJson(res, 503, {
        status: 'not_ready',
        reason: 'worker_not_loaded',
        error: String(workerLoadError?.message || workerLoadError)
      });
    }
    return sendJson(res, 200, { status: 'ready' });
  }

  // If worker failed to load, return a clear 502 for everything else
  if (!fetchHandler) {
    return sendJson(res, 502, {
      error: 'worker_unavailable',
      message: String(workerLoadError?.message || workerLoadError),
      hint: 'Check Hostless Logs tab for the full import error.'
    });
  }

  try {
    const protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = req.headers.host || `${HOST}:${PORT}`;
    const url = new URL(req.url, `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = Readable.toWeb(req);
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      ...(body ? { body, duplex: 'half' } : {})
    });

    // ---------- Polyfill Cloudflare-specific request.cf ----------
    // Cloudflare Workers' Request has a .cf object with datacenter metadata
    // (colo, country, city, asn, tlsVersion, httpProtocol, ...). Node's
    // Request does NOT — so worker code that reads request.cf.colo throws
    // "Cannot read properties of undefined (reading 'colo')".
    // We attach a stub .cf with sensible defaults derived from headers.
    const xff = req.headers['x-forwarded-for'];
    const clientIp = (xff && String(xff).split(',')[0].trim()) ||
                     req.headers['x-real-ip'] ||
                     req.socket?.remoteAddress?.replace(/^::ffff:/, '') ||
                     '127.0.0.1';

    const cfStub = {
      // Datacenter / edge metadata — no real Cloudflare POP on Hostless.
      // Use a stable placeholder so worker logic that picks a colo still works.
      colo: process.env.CF_COLO_OVERRIDE || 'SJC',
      edgeRequestModifyTime: Date.now(),
      metroRegion: null,
      regionCode: null,
      timezone: process.env.TZ || 'UTC',

      // Geo derived from Cloudflare headers — Hostless may set some of these.
      country: req.headers['cf-ipcountry'] || process.env.CF_COUNTRY || 'XX',
      city: req.headers['cf-ipcity'] || 'Unknown',
      region: req.headers['cf-region'] || '',
      postalCode: req.headers['cf-postal-code'] || '',
      continent: req.headers['cf-ipcontinent'] || 'NA',
      latitude: req.headers['cf-iplatitude'] || '0',
      longitude: req.headers['cf-iplongitude'] || '0',

      // Client / network
      clientTcpRtt: 0,
      clientTrustScore: 100,
      botManagement: { score: 100, staticResource: false, verifiedBot: false, ja3Hash: '' },
      ja3Hash: '',

      // ASN / ISP
      asn: Number(req.headers['cf-ipasn'] || 0),
      asOrganization: req.headers['cf-asorganization'] || '',

      // IP (some Cloudflare Workers read this from request.cf, some from headers)
      ip: clientIp,

      // TLS
      tlsVersion: req.headers['x-tls-version'] || 'TLSv1.3',
      tlsCipher: req.headers['x-tls-cipher'] || 'TLS_AES_128_GCM_SHA256',
      tlsClientAuthIssuerName: '',
      tlsClientAuthSubjectName: '',
      tlsClientAuthCertFingerprintSHA1: '',
      tlsClientAuthCertFingerprintSHA256: '',
      tlsClientAuthCertIssuerDN: '',
      tlsClientAuthCertSubjectDN: '',
      tlsClientAuthCertValidStartDate: '',
      tlsClientAuthCertValidEndDate: '',
      tlsClientAuthSerialNumber: '',

      // HTTP
      httpProtocol: (req.httpVersion && `HTTP/${req.httpVersion}`) || 'HTTP/1.1',
      requestPriority: '',
      pageNgtm: '',
      pageNgtmFlags: [],

      // Misc
      weight: 1,
      fetchSubscription: false,
      privacy: { clientHintList: [] }
    };

    // Attach .cf to the Request. Request objects in Node are extensible,
    // but we use defineProperty to be safe against any frozen prototypes.
    try {
      Object.defineProperty(request, 'cf', {
        value: cfStub,
        writable: true,
        configurable: true,
        enumerable: false
      });
    } catch {
      // Fallback: direct assign
      request.cf = cfStub;
    }

    const response = await fetchHandler(request, env, ctx);

    res.statusCode = response.status || 200;
    response.headers.forEach((value, key) => {
      try { res.setHeader(key, value); } catch { /* ignore invalid header */ }
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('[server] request error:');
    console.error('  url:', req.method, req.url);
    console.error('  message:', err?.message);
    console.error('  name:', err?.name);
    console.error('  code:', err?.code);
    if (err?.stack) console.error('  stack:', err.stack);
    if (err?.cause) console.error('  cause:', err.cause);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
    }
    res.end(JSON.stringify({
      error: 'internal_server_error',
      message: String(err?.message || err),
      name: String(err?.name || 'Error'),
      code: err?.code || null,
      stack: String(err?.stack || ''),
      request: { method: req.method, url: req.url }
    }, null, 2));
  } finally {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms`);
  }
});

server.on('error', (err) => {
  console.error('[server] server error:', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[server] Edgepanel listening on http://${HOST}:${PORT}`);
  console.log(`[server] Health endpoints:`);
  console.log(`[server]   GET /__health -> 200 (always, liveness probe)`);
  console.log(`[server]   GET /__ready  -> 200 if worker loaded, 503 otherwise`);
  console.log(`[server] Worker loaded: ${!!fetchHandler}`);
  if (workerLoadError) {
    console.error(`[server] Worker load error:`, workerLoadError);
  }
  console.log(`[server] Cloudflare bindings on Hostless are stubbed (KV/D1/R2/ASSETS unavailable).`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[server] received ${sig}, shutting down...`);
    server.close(() => process.exit(0));
  });
}
